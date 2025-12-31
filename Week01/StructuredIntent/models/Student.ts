import { Validators } from "../types/Validators";
import { ValidationError, DuplicateStudentError } from "../types/Errors";

/**
 * Represents a student in the system
 * - Strong validation of email and ID format
 * - Enforces uniqueness through repository
 * - Tracks academic standing and eligibility
 */
export class Student {
  private readonly id: string;
  private readonly email: string;
  private name: string;
  private programme: string;
  private year: number; // 1, 2, 3, 4
  private academicStanding: "good" | "probation" | "suspended";
  private completedCourses: Set<string>;
  private gpa: number;

  constructor(
    id: string,
    name: string,
    email: string,
    programme: string,
    year: number,
    academicStanding: "good" | "probation" | "suspended" = "good"
  ) {
    Validators.validateStudentId(id);
    Validators.validateNonEmpty(name, "name");
    Validators.validateEmail(email);
    Validators.validateNonEmpty(programme, "programme");
    Validators.validatePositiveInteger(year, "year");

    if (year < 1 || year > 4) {
      throw new ValidationError("year", "must be between 1 and 4");
    }

    this.id = id;
    this.name = name;
    this.email = email;
    this.programme = programme;
    this.year = year;
    this.academicStanding = academicStanding;
    this.completedCourses = new Set();
    this.gpa = 4.0;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getProgramme(): string {
    return this.programme;
  }

  getYear(): number {
    return this.year;
  }

  getAcademicStanding(): "good" | "probation" | "suspended" {
    return this.academicStanding;
  }

  setAcademicStanding(standing: "good" | "probation" | "suspended"): void {
    this.academicStanding = standing;
  }

  getGPA(): number {
    return this.gpa;
  }

  setGPA(gpa: number): void {
    if (gpa < 0 || gpa > 4.0) {
      throw new ValidationError("gpa", "must be between 0 and 4.0");
    }
    this.gpa = gpa;
  }

  hasCompletedCourse(courseId: string): boolean {
    return this.completedCourses.has(courseId);
  }

  getCompletedCourses(): string[] {
    return Array.from(this.completedCourses);
  }

  addCompletedCourse(courseId: string): void {
    this.completedCourses.add(courseId);
  }

  isEligible(): boolean {
    return this.academicStanding !== "suspended";
  }

  toString(): string {
    return `Student(${this.id}, ${this.name}, ${this.email}, ${this.programme} Y${this.year}, ${this.academicStanding})`;
  }
}
