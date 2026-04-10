import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@/router';
import './index.css';

const saved = localStorage.getItem('ecu_theme') ?? 'dark';
document.documentElement.classList.toggle('dark', saved === 'dark');

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry:               1,
            staleTime:           30_000,
            refetchOnWindowFocus: false,
        },
    },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppRouter />
        </QueryClientProvider>
    </StrictMode>
);