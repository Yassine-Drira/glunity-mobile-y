import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TaggedUser {
	id: string;
	fullName: string;
	username?: string;
	avatarUrl?: string;
}

export interface ReelData {
	videoUri: string | null;
	videoDimensions: { width: number; height: number } | null;
	videoThumbnail: string | null;
	selectedCover: string | null;
	caption: string;
	category: 'recipes' | 'tips' | 'products' | 'lifestyle';
	taggedUsers: TaggedUser[];
	duration: number; // in milliseconds
}

const initialState: ReelData = {
	videoUri: null,
	videoDimensions: null,
	videoThumbnail: null,
	selectedCover: null,
	caption: '',
	category: 'recipes',
	taggedUsers: [],
	duration: 0,
};

interface ReelCreationContextType {
	reelData: ReelData;
	updateReelData: (updates: Partial<ReelData>) => void;
	resetReelData: () => void;
}

const ReelCreationContext = createContext<ReelCreationContextType | undefined>(undefined);

export function ReelCreationProvider({ children }: { children: ReactNode }) {
	const [reelData, setReelData] = useState<ReelData>(initialState);

	const updateReelData = (updates: Partial<ReelData>) => {
		setReelData((prev) => ({ ...prev, ...updates }));
	};

	const resetReelData = () => {
		setReelData(initialState);
	};

	return (
		<ReelCreationContext.Provider value={{ reelData, updateReelData, resetReelData }}>
			{children}
		</ReelCreationContext.Provider>
	);
}

export function useReelCreation() {
	const context = useContext(ReelCreationContext);
	if (!context) {
		throw new Error('useReelCreation must be used within ReelCreationProvider');
	}
	return context;
}
