import { BellIcon } from '@heroicons/react/24/outline';

export default function Header() {
    return (
        <header className="bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div></div>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                            <span className="sr-only">Ver notificaciones</span>
                            <BellIcon className="h-6 w-6" />
                        </button>
                        <div className="relative">
                            <button
                                type="button"
                                className="flex items-center gap-2 p-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
                            >
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-600">A</span>
                                </div>
                                <span>Admin</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}