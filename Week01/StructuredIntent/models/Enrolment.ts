/**
 * Represents a student's enrolment in a course
 * First-class concept with atomic invariants
 */
export class Enrolment {
  private readonly studentId: string;
  private readonly courseId: string;
  private readonly enrolledDate: Date;
  private status: "active" | "dropped" | "waitlisted";
  private grade?: number;
  private droppedDate?: Date;

  constructor(studentId: string, courseId: string, status: "active" | "waitlisted" = "active") {
    this.studentId = studentId;
    this.courseId = courseId;
    this.enrolledDate = new Date();
    this.status = status;
  }

  getStudentId(): string {
    return this.studentId;
  }

  getCourseId(): string {
    return this.courseId;
  }

  getEnrolledDate(): Date {
    return this.enrolledDate;
  }

  getStatus(): "active" | "dropped" | "waitlisted" {
    return this.status;
  }

  markAsDropped(): void {
    this.status = "dropped";
    this.droppedDate = new Date();
  }

  markAsWaitlisted(): void {
    this.status = "waitlisted";
  }

  markAsActive(): void {
    this.status = "active";
  }

  isActive(): boolean {
    return this.status === "active";
  }

  isWaitlisted(): boolean {
    return this.status === "waitlisted";
  }

  isDropped(): boolean {
    return this.status === "dropped";
  }

  setGrade(grade: number): void {
    if (grade < 0 || grade > 100) {
      throw new Error("Grade must be between 0 and 100");
    }
    if (this.status !== "dropped") {
      this.grade = grade;
    }
  }

  getGrade(): number | undefined {
    return this.grade;
  }

  getDaysEnrolled(): number {
    const now = new Date();
    return Math.floor(
      (now.getTime() - this.enrolledDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  toString(): string {
    return `Enrolment(${this.studentId} -> ${this.courseId}, ${this.status}, enrolled ${this.enrolledDate.toISOString()})`;
  }
}
