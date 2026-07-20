import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        this.setState({ info });
        console.error('[ErrorBoundary]', error, info);
    }

    handleReload() {
        window.location.reload();
    }

    handleReset() {
        this.setState({ hasError: false, error: null, info: null });
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const msg  = this.state.error?.message || 'Error desconocido';
        const stack = this.state.info?.componentStack || '';

        return (
            <div style={{
                minHeight: '100vh',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter','Segoe UI',sans-serif",
                padding: '2rem',
            }}>
                <div style={{
                    background: 'rgba(30,41,59,0.9)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: '1.25rem',
                    padding: '2.5rem',
                    maxWidth: '680px',
                    width: '100%',
                    boxShadow: '0 0 60px rgba(239,68,68,0.12)',
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔴</div>
                    <h2 style={{ margin: '0 0 0.5rem', color: '#ef4444', fontSize: '1.2rem', fontWeight: 800 }}>
                        Algo salió mal
                    </h2>
                    <p style={{ margin: '0 0 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                        Se produjo un error inesperado en la aplicación.
                    </p>

                    {/* Mensaje de error */}
                    <div style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '0.6rem',
                        padding: '0.85rem 1rem',
                        marginBottom: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        color: '#fca5a5',
                        wordBreak: 'break-word',
                    }}>
                        {msg}
                    </div>

                    {/* Stack trace colapsable */}
                    {stack && (
                        <details style={{ marginBottom: '1.5rem' }}>
                            <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                                Ver stack trace
                            </summary>
                            <pre style={{
                                background: 'rgba(15,23,42,0.8)',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                                fontSize: '0.72rem',
                                color: '#94a3b8',
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                                margin: 0,
                            }}>
                                {stack}
                            </pre>
                        </details>
                    )}

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={this.handleReload.bind(this)}
                            style={{
                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                border: 'none', borderRadius: '0.6rem',
                                padding: '0.6rem 1.2rem',
                                color: '#fff', fontSize: '0.85rem', fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            🔄 Recargar página
                        </button>
                        <button
                            onClick={this.handleReset.bind(this)}
                            style={{
                                background: 'rgba(99,102,241,0.12)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                borderRadius: '0.6rem',
                                padding: '0.6rem 1.2rem',
                                color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
