/**
 * Domain-specific error types for the enrolment system
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StudentNotFoundError extends DomainError {
  constructor(studentId: string) {
    super(`Student with ID "${studentId}" not found`);
  }
}

export class CourseNotFoundError extends DomainError {
  constructor(courseId: string) {
    super(`Course with ID "${courseId}" not found`);
  }
}

export class CourseFullError extends DomainError {
  constructor(courseId: string) {
    super(`Course "${courseId}" has reached maximum capacity`);
  }
}

export class AlreadyEnrolledError extends DomainError {
  constructor(studentId: string, courseId: string) {
    super(`Student "${studentId}" is already enrolled in course "${courseId}"`);
  }
}

export class PrerequisiteNotMetError extends DomainError {
  constructor(studentId: string, courseId: string, missingPrerequisites: string[]) {
    super(
      `Student "${studentId}" has not completed prerequisites for course "${courseId}": ${missingPrerequisites.join(", ")}`
    );
  }
}

export class CoRequisiteNotMetError extends DomainError {
  constructor(studentId: string, courseId: string, missingCorequisites: string[]) {
    super(
      `Student "${studentId}" must be enrolled in co-requisites for course "${courseId}": ${missingCorequisites.join(", ")}`
    );
  }
}

export class TimetableClashError extends DomainError {
  constructor(studentId: string, courseId: string, clashingCourses: string[]) {
    super(
      `Student "${studentId}" has timetable clash with course "${courseId}". Conflicts with: ${clashingCourses.join(", ")}`
    );
  }
}

export class EnrolmentWindowClosedError extends DomainError {
  constructor(courseId: string, phase: "registration" | "add-drop" | "withdrawal") {
    super(
      `${phase} window is closed for course "${courseId}"`
    );
  }
}

export class StudentIneligibleError extends DomainError {
  constructor(studentId: string, courseId: string, reason: string) {
    super(
      `Student "${studentId}" is ineligible for course "${courseId}": ${reason}`
    );
  }
}

export class ValidationError extends DomainError {
  constructor(field: string, message: string) {
    super(`Validation error for ${field}: ${message}`);
  }
}

export class DuplicateStudentError extends DomainError {
  constructor(field: string, value: string) {
    super(`A student with ${field} "${value}" already exists`);
  }
}

export class DuplicateCourseError extends DomainError {
  constructor(courseId: string) {
    super(`A course with ID "${courseId}" already exists`);
  }
}

export class WaitlistFullError extends DomainError {
  constructor(courseId: string) {
    super(`Waitlist for course "${courseId}" has reached maximum size`);
  }
}
