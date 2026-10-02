import type { StartEntry, TimeEntry, Tour, UpdateEntry } from "../../../packages/shared/src/index.js";
export declare class TimeTrackingService {
    list(userId: string, date: string): TimeEntry[];
    /** Liefert alle in der DB gespeicherten Einträge eines Nutzers in einem Datumsbereich (für den Excel-Export). */
    listRange(userId: string, fromDate: string, toDate: string): TimeEntry[];
    start(userId: string, input: StartEntry): TimeEntry;
    stop(userId: string, date: string, tour: Tour): TimeEntry;
    update(userId: string, id: string, changes: UpdateEntry): TimeEntry;
    private key;
    private emptyEntry;
    private findEntry;
    private findById;
    private save;
}
