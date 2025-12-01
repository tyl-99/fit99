import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

interface Set {
    id: string;
    weight: number;
    reps: number;
    created_at: string;
}

interface Exercise {
    id: string;
    name: string;
}

interface SessionExercise {
    exercise: Exercise;
    sets: Set[];
}

export const Session: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [sessionName, setSessionName] = useState('');
    const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
    const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddExercise, setShowAddExercise] = useState(false);

    // Form state for new sets: { [exerciseId]: { weight: string, reps: string } }
    const [newSetData, setNewSetData] = useState<Record<string, { weight: string; reps: string }>>({});

    useEffect(() => {
        if (id) {
            fetchSessionData();
            fetchAvailableExercises();
        }
    }, [id]);

    const fetchAvailableExercises = async () => {
        const { data } = await supabase.from('exercises').select('*').order('name');
        setAvailableExercises(data || []);
    };

    const fetchSessionData = async () => {
        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (sessionError) throw sessionError;
            setSessionName(sessionData.name || '');

            const { data: setsData, error: setsError } = await supabase
                .from('sets')
                .select('*, exercises(name)')
                .eq('session_id', id)
                .order('created_at');

            if (setsError) throw setsError;

            const grouped: Record<string, SessionExercise> = {};

            for (const set of setsData || []) {
                const exId = set.exercise_id;
                // @ts-ignore
                const exName = set.exercises.name;

                if (!grouped[exId]) {
                    grouped[exId] = {
                        exercise: { id: exId, name: exName },
                        sets: []
                    };
                }
                grouped[exId].sets.push({
                    id: set.id,
                    weight: set.weight,
                    reps: set.reps,
                    created_at: set.created_at
                });
            }

            setSessionExercises(Object.values(grouped));
        } catch (error) {
            console.error('Error loading session:', error);
        } finally {
            setLoading(false);
        }
    };

    const addExerciseToSession = async (exerciseId: string) => {
        const exercise = availableExercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        if (sessionExercises.find(se => se.exercise.id === exerciseId)) {
            setShowAddExercise(false);
            return;
        }

        // 1. Add to local state immediately
        const newSessionExercise: SessionExercise = {
            exercise,
            sets: []
        };
        setSessionExercises(prev => [...prev, newSessionExercise]);
        setShowAddExercise(false);

        // 2. Auto-fill from history
        try {
            // Find last session with this exercise
            const { data: lastSet } = await supabase
                .from('sets')
                .select('session_id')
                .eq('exercise_id', exerciseId)
                .neq('session_id', id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (lastSet) {
                // Get all sets from that session
                const { data: history } = await supabase
                    .from('sets')
                    .select('*')
                    .eq('session_id', lastSet.session_id)
                    .eq('exercise_id', exerciseId)
                    .order('created_at');

                if (history && history.length > 0) {
                    // Clone them to current session
                    const setsToInsert = history.map(h => ({
                        session_id: id,
                        exercise_id: exerciseId,
                        weight: h.weight,
                        reps: h.reps
                    }));

                    const { data: newSets, error } = await supabase
                        .from('sets')
                        .insert(setsToInsert)
                        .select();

                    if (error) throw error;

                    // Update local state with new sets
                    if (newSets) {
                        setSessionExercises(prev => prev.map(pe => {
                            if (pe.exercise.id === exerciseId) {
                                return { ...pe, sets: newSets };
                            }
                            return pe;
                        }));

                        // Pre-fill input for the NEXT set based on the last one
                        const last = newSets[newSets.length - 1];
                        setNewSetData(prev => ({
                            ...prev,
                            [exerciseId]: { weight: last.weight.toString(), reps: last.reps.toString() }
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('Error auto-filling sets:', error);
        }
    };

    const addSet = async (exerciseId: string) => {
        const input = newSetData[exerciseId];
        if (!input || !input.weight || !input.reps) return;

        try {
            const { data, error } = await supabase
                .from('sets')
                .insert([{
                    session_id: id,
                    exercise_id: exerciseId,
                    weight: parseFloat(input.weight),
                    reps: parseInt(input.reps)
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setSessionExercises(prev => prev.map(pe => {
                    if (pe.exercise.id === exerciseId) {
                        return { ...pe, sets: [...pe.sets, data] };
                    }
                    return pe;
                }));
            }
        } catch (error) {
            console.error('Error adding set:', error);
            alert('Failed to add set');
        }
    };

    const updateSet = async (setId: string, field: 'weight' | 'reps', value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        // Optimistic update
        setSessionExercises(prev => prev.map(pe => ({
            ...pe,
            sets: pe.sets.map(s => s.id === setId ? { ...s, [field]: numValue } : s)
        })));

        try {
            const { error } = await supabase
                .from('sets')
                .update({ [field]: numValue })
                .eq('id', setId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating set:', error);
            // Revert if needed (omitted for simplicity)
        }
    };

    const deleteSet = async (setId: string, exerciseId: string) => {
        try {
            const { error } = await supabase.from('sets').delete().eq('id', setId);
            if (error) throw error;

            setSessionExercises(prev => prev.map(pe => {
                if (pe.exercise.id === exerciseId) {
                    return { ...pe, sets: pe.sets.filter(s => s.id !== setId) };
                }
                return pe;
            }));
        } catch (error) {
            console.error('Error deleting set:', error);
        }
    };

    return (
        <div>
            <div className="header">
                <button className="btn btn-icon" onClick={() => navigate('/')}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem' }}>{sessionName}</h2>
                <div style={{ width: 24 }}></div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : (
                <div style={{ paddingBottom: '5rem' }}>
                    {sessionExercises.map((se) => (
                        <div key={se.exercise.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3>{se.exercise.name}</h3>
                            </div>

                            {/* Sets List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                {se.sets.map((set, idx) => (
                                    <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '6px' }}>
                                        <span style={{ color: 'var(--text-secondary)', width: '1.5rem', fontSize: '0.9rem' }}>#{idx + 1}</span>

                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                className="input"
                                                style={{ padding: '0.4rem', textAlign: 'center' }}
                                                type="number"
                                                defaultValue={set.weight}
                                                onBlur={(e) => updateSet(set.id, 'weight', e.target.value)}
                                            />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>lbs</span>
                                        </div>

                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                className="input"
                                                style={{ padding: '0.4rem', textAlign: 'center' }}
                                                type="number"
                                                defaultValue={set.reps}
                                                onBlur={(e) => updateSet(set.id, 'reps', e.target.value)}
                                            />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>reps</span>
                                        </div>

                                        <button className="btn btn-icon" style={{ color: 'var(--danger-color)', padding: '0.2rem' }} onClick={() => deleteSet(set.id, se.exercise.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Set Form */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="lbs"
                                    value={newSetData[se.exercise.id]?.weight || ''}
                                    onChange={(e) => setNewSetData({ ...newSetData, [se.exercise.id]: { ...newSetData[se.exercise.id], weight: e.target.value } })}
                                />
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="reps"
                                    value={newSetData[se.exercise.id]?.reps || ''}
                                    onChange={(e) => setNewSetData({ ...newSetData, [se.exercise.id]: { ...newSetData[se.exercise.id], reps: e.target.value } })}
                                />
                                <button className="btn btn-primary" onClick={() => addSet(se.exercise.id)}>
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button className="btn" style={{ width: '100%', marginTop: '1rem', borderStyle: 'dashed' }} onClick={() => setShowAddExercise(true)}>
                        <Plus size={20} /> Add Exercise
                    </button>
                </div>
            )}

            {showAddExercise && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3>Select Exercise</h3>
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {availableExercises.map(ex => (
                                <button
                                    key={ex.id}
                                    className="btn"
                                    style={{ justifyContent: 'flex-start' }}
                                    onClick={() => addExerciseToSession(ex.id)}
                                >
                                    {ex.name}
                                </button>
                            ))}
                        </div>
                        <button className="btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setShowAddExercise(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
