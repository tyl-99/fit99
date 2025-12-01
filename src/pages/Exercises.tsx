import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';

interface Exercise {
    id: string;
    name: string;
}

export const Exercises: React.FC = () => {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [newExercise, setNewExercise] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExercises();
    }, []);

    const fetchExercises = async () => {
        try {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .order('name');

            if (error) throw error;
            setExercises(data || []);
        } catch (error) {
            console.error('Error fetching exercises:', error);
        } finally {
            setLoading(false);
        }
    };

    const addExercise = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExercise.trim()) return;

        try {
            const { data, error } = await supabase
                .from('exercises')
                .insert([{ name: newExercise.trim() }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setExercises([...exercises, data].sort((a, b) => a.name.localeCompare(b.name)));
                setNewExercise('');
            }
        } catch (error) {
            console.error('Error adding exercise:', error);
            alert('Failed to add exercise');
        }
    };

    const deleteExercise = async (id: string) => {
        if (!confirm('Are you sure? This will not delete history but will remove it from the list.')) return;
        try {
            const { error } = await supabase
                .from('exercises')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setExercises(exercises.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting exercise:', error);
            alert('Failed to delete exercise');
        }
    };

    return (
        <div>
            <div className="header">
                <h2>Exercises</h2>
            </div>

            <form onSubmit={addExercise} style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="New Exercise Name"
                    value={newExercise}
                    onChange={(e) => setNewExercise(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-icon">
                    <Plus size={24} />
                </button>
            </form>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : (
                <div>
                    {exercises.map((exercise) => (
                        <div key={exercise.id} className="list-item">
                            <span>{exercise.name}</span>
                            <button
                                className="btn btn-icon"
                                style={{ color: 'var(--danger-color)' }}
                                onClick={() => deleteExercise(exercise.id)}
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
