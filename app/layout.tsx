import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SupabaseProvider from './providers';
import { Toaster } from 'react-hot-toast';
import { toasterConfig } from '@/lib/notifications';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'ReservaYA - Sistema de Reservas Deportivas',
    description: 'Sistema de gestión de reservas para instalaciones deportivas'
};

export default function RootLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={`${inter.className} antialiased`}>
                <SupabaseProvider>
                    {children}
                </SupabaseProvider>
                <Toaster {...toasterConfig} />
            </body>
        </html>
    );
}
