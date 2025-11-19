// components/markdown-editor/hooks/useCUMModals.ts

import { useState, useCallback } from 'react';
import { CUMExtensionType } from '@/components/markdown-editor/types/cum-extensions';

export interface CUMModalState {
    buttonModal: boolean;
    alertModal: boolean;
    embedModal: boolean;
    tableModal: boolean;
}

export interface UseCUMModalsReturn {
    modals: CUMModalState;
    openModal: (type: CUMExtensionType) => void;
    closeModal: (type: CUMExtensionType) => void;
    closeAllModals: () => void;
}

export function useCUMModals(): UseCUMModalsReturn {
    const [modals, setModals] = useState<CUMModalState>({
        buttonModal: false,
        alertModal: false,
        embedModal: false,
        tableModal: false,
    });

    const openModal = useCallback((type: CUMExtensionType) => {
        setModals(prev => ({
            ...prev,
            [`${type}Modal`]: true,
        }));
    }, []);

    const closeModal = useCallback((type: CUMExtensionType) => {
        setModals(prev => ({
            ...prev,
            [`${type}Modal`]: false,
        }));
    }, []);

    const closeAllModals = useCallback(() => {
        setModals({
            buttonModal: false,
            alertModal: false,
            embedModal: false,
            tableModal: false,
        });
    }, []);

    return {
        modals,
        openModal,
        closeModal,
        closeAllModals,
    };
}