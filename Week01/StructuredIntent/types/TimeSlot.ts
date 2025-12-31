/**
 * Represents a time slot for a course
 */
export class TimeSlot {
  constructor(
    readonly day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN",
    readonly startTime: number, // 0-2359 (e.g., 1430 = 2:30 PM)
    readonly endTime: number,    // 0-2359
    readonly semester: number    // 1 or 2
  ) {
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }
    if (startTime < 0 || endTime > 2359) {
      throw new Error("Time must be between 0 and 2359");
    }
    if (semester !== 1 && semester !== 2) {
      throw new Error("Semester must be 1 or 2");
    }
  }

  /**
   * Check if this time slot clashes with another
   */
  clashWith(other: TimeSlot): boolean {
    if (this.day !== other.day || this.semester !== other.semester) {
      return false;
    }
    return !(this.endTime <= other.startTime || this.startTime >= other.endTime);
  }

  toString(): string {
    return `${this.day} ${String(this.startTime).padStart(4, "0")}-${String(this.endTime).padStart(4, "0")}`;
  }
}
