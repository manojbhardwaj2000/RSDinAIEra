import { Student } from "./Student";

/**
 * Represents a course that students can enrol in
 */
export class Course {
  private id: string;
  private name: string;
  private capacity: number;
  private enrolledStudents: Map<string, Student>;

  constructor(id: string, name: string, capacity: number) {
    if (!id || !name || capacity <= 0) {
      throw new Error("Course must have id, name, and positive capacity");
    }
    this.id = id;
    this.name = name;
    this.capacity = capacity;
    this.enrolledStudents = new Map();
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
    return this.enrolledStudents.size;
  }

  isAvailable(): boolean {
    return this.getEnrolledCount() < this.capacity;
  }

  enrollStudent(student: Student): boolean {
    if (this.enrolledStudents.has(student.getId())) {
      return false; // Student already enrolled
    }
    if (!this.isAvailable()) {
      return false; // Course is at capacity
    }
    this.enrolledStudents.set(student.getId(), student);
    return true;
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
