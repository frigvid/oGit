import { TFile, TFolder } from "obsidian";

export interface CapabilityProvider {
    execute(fileOrFolder: TFile | TFolder): Promise<void>;
    getCommandName(): string;
    getIcon(): string;
    getCommandId(): string;
    shouldShowFor?(fileOrFolder: TFile | TFolder): boolean;
}