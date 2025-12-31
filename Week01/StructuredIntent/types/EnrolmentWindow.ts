/**
 * Represents an enrolment window with time-based constraints
 */
export class EnrolmentWindow {
  constructor(
    readonly phase: "registration" | "add-drop" | "withdrawal",
    readonly startDate: Date,
    readonly endDate: Date,
    readonly semester: number
  ) {
    if (startDate >= endDate) {
      throw new Error("Start date must be before end date");
    }
    if (semester !== 1 && semester !== 2) {
      throw new Error("Semester must be 1 or 2");
    }
  }

  /**
   * Check if the window is currently open
   */
  isOpen(referenceDate: Date = new Date()): boolean {
    return referenceDate >= this.startDate && referenceDate <= this.endDate;
  }

  toString(): string {
    return `${this.phase} (${this.startDate.toISOString()} - ${this.endDate.toISOString()})`;
  }
}
