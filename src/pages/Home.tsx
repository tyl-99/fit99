import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';

interface Session {
    id: string;
    created_at: string;
    name: string | null;
}

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const startSession = async () => {
        try {
            // Count sessions for today to generate name
            const today = new Date().toISOString().split('T')[0];
            const { count } = await supabase
                .from('sessions')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today);

            const sessionNumber = (count || 0) + 1;
            const date = new Date();
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            const newName = `${dateStr} - Session ${sessionNumber}`;

            const { data, error } = await supabase
                .from('sessions')
                .insert([{
                    created_at: new Date().toISOString(),
                    name: newName
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                navigate(`/session/${data.id}`);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Failed to start session');
        }
    };

    const deleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent navigation
        if (!confirm('Are you sure you want to delete this workout?')) return;

        try {
            const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSessions(sessions.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Failed to delete session');
        }
    };

    return (
        <div>
            <div className="header" style={{ position: 'relative', zIndex: 1 }}>
                <h2>Recent Workouts</h2>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : (
                <div style={{ paddingBottom: '5rem' }}>
                    {sessions.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No sessions yet. Start one!
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                className="card"
                                onClick={() => navigate(`/session/${session.id}`)}
                                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                                        {session.name || 'Workout'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-icon"
                                    style={{ color: 'var(--danger-color)', padding: '0.5rem' }}
                                    onClick={(e) => deleteSession(e, session.id)}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <button className="fab" onClick={startSession}>
                <Plus size={32} />
            </button>
        </div>
    );
};
