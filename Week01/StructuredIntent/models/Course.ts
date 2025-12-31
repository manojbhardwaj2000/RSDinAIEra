import { Validators } from "../types/Validators";
import { TimeSlot } from "../types/TimeSlot";
import { EnrolmentWindow } from "../types/EnrolmentWindow";

/**
 * Represents a course in the system
 * - Strong validation of course ID format
 * - Enforces capacity and waitlist constraints
 * - Tracks prerequisites, co-requisites, and timetable
 * - Manages enrolment windows for atomic operations
 */
export class Course {
  private readonly id: string;
  private name: string;
  private capacity: number;
  private enrolled: Map<string, Date>; // studentId -> enrolment date
  private waitlist: string[];
  private maxWaitlistSize: number;
  private prerequisites: Set<string>;
  private corequisites: Set<string>;
  private timeSlots: TimeSlot[];
  private enrolmentWindows: Map<"registration" | "add-drop" | "withdrawal", EnrolmentWindow>;
  private minimumYear: number;
  private allowedProgrammes: Set<string>;

  constructor(
    id: string,
    name: string,
    capacity: number,
    minimumYear: number = 1,
    allowedProgrammes: string[] = []
  ) {
    Validators.validateCourseId(id);
    Validators.validateNonEmpty(name, "name");
    Validators.validatePositiveInteger(capacity, "capacity");

    this.id = id;
    this.name = name;
    this.capacity = capacity;
    this.enrolled = new Map();
    this.waitlist = [];
    this.maxWaitlistSize = Math.ceil(capacity * 0.2); // 20% of capacity
    this.prerequisites = new Set();
    this.corequisites = new Set();
    this.timeSlots = [];
    this.enrolmentWindows = new Map();
    this.minimumYear = minimumYear;
    this.allowedProgrammes = new Set(allowedProgrammes);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getCapacity(): number {
    return this.capacity;
  }

  getEnrolledCount(): number {
    return this.enrolled.size;
  }

  getWaitlistSize(): number {
    return this.waitlist.length;
  }

  isAvailable(): boolean {
    return this.getEnrolledCount() < this.capacity;
  }

  isStudentEnrolled(studentId: string): boolean {
    return this.enrolled.has(studentId);
  }

  getEnrolledStudents(): string[] {
    return Array.from(this.enrolled.keys());
  }

  getWaitlist(): string[] {
    return [...this.waitlist];
  }

  /**
   * Add a prerequisite course
   */
  addPrerequisite(courseId: string): void {
    this.prerequisites.add(courseId);
  }

  getPrerequisites(): string[] {
    return Array.from(this.prerequisites);
  }

  /**
   * Add a co-requisite course
   */
  addCorequisite(courseId: string): void {
    this.corequisites.add(courseId);
  }

  getCorequisites(): string[] {
    return Array.from(this.corequisites);
  }

  /**
   * Add a time slot for this course
   */
  addTimeSlot(timeSlot: TimeSlot): void {
    this.timeSlots.push(timeSlot);
  }

  getTimeSlots(): TimeSlot[] {
    return [...this.timeSlots];
  }

  /**
   * Set an enrolment window
   */
  setEnrolmentWindow(window: EnrolmentWindow): void {
    this.enrolmentWindows.set(window.phase, window);
  }

  getEnrolmentWindow(
    phase: "registration" | "add-drop" | "withdrawal"
  ): EnrolmentWindow | undefined {
    return this.enrolmentWindows.get(phase);
  }

  isEnrolmentWindowOpen(
    phase: "registration" | "add-drop" | "withdrawal",
    referenceDate: Date = new Date()
  ): boolean {
    const window = this.enrolmentWindows.get(phase);
    if (!window) return false;
    return window.isOpen(referenceDate);
  }

  setMinimumYear(year: number): void {
    this.minimumYear = year;
  }

  getMinimumYear(): number {
    return this.minimumYear;
  }

  setAllowedProgrammes(programmes: string[]): void {
    this.allowedProgrammes = new Set(programmes);
  }

  getAllowedProgrammes(): string[] {
    return Array.from(this.allowedProgrammes);
  }

  /**
   * Attempt to enrol a student (atomically)
   * Returns true if enrolment successful, false otherwise
   */
  enrollStudent(studentId: string): boolean {
    if (this.enrolled.has(studentId)) {
      return false; // Already enrolled
    }

    // Try to enrol directly if space available
    if (this.isAvailable()) {
      this.enrolled.set(studentId, new Date());
      return true;
    }

    // Try to add to waitlist if space available
    if (this.waitlist.length < this.maxWaitlistSize) {
      this.waitlist.push(studentId);
      return false; // Added to waitlist, not directly enrolled
    }

    // Both enrolment and waitlist are full
    return false;
  }

  /**
   * Remove a student from the course (atomically)
   */
  dropStudent(studentId: string): boolean {
    const wasEnrolled = this.enrolled.delete(studentId);

    if (wasEnrolled && this.waitlist.length > 0) {
      // Promote first student from waitlist
      const nextStudent = this.waitlist.shift()!;
      this.enrolled.set(nextStudent, new Date());
    }

    // Also remove from waitlist if present
    const waitlistIndex = this.waitlist.indexOf(studentId);
    if (waitlistIndex !== -1) {
      this.waitlist.splice(waitlistIndex, 1);
      return true;
    }

    return wasEnrolled;
  }

  toString(): string {
    return `Course(${this.id}, ${this.name}, enrolled=${this.getEnrolledCount()}/${this.capacity}, waitlist=${this.getWaitlistSize()})`;
  }
}

  }

  dropStudent(studentId: string): boolean {
    return this.enrolledStudents.delete(studentId);
  }

  isStudentEnrolled(studentId: string): boolean {
    return this.enrolledStudents.has(studentId);
  }

  getEnrolledStudents(): Student[] {
    return Array.from(this.enrolledStudents.values());
  }

  toString(): string {
    return `Course(${this.id}, ${this.name}, ${this.getEnrolledCount()}/${this.capacity})`;
  }
}
