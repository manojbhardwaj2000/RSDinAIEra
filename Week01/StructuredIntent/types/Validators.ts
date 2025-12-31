import { ValidationError } from "./Errors";

/**
 * Validation utilities for domain models
 */

export class Validators {
  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("email", `"${email}" is not a valid email format`);
    }
  }

  /**
   * Validate student ID format (e.g., S + 6 digits)
   */
  static validateStudentId(id: string): void {
    const studentIdRegex = /^S\d{6}$/;
    if (!studentIdRegex.test(id)) {
      throw new ValidationError(
        "studentId",
        `"${id}" must be in format S followed by 6 digits (e.g., S123456)`
      );
    }
  }

  /**
   * Validate course ID format (e.g., CS + 4 digits)
   */
  static validateCourseId(id: string): void {
    const courseIdRegex = /^[A-Z]{2,4}\d{3,4}$/;
    if (!courseIdRegex.test(id)) {
      throw new ValidationError(
        "courseId",
        `"${id}" must be in format 2-4 letters followed by 3-4 digits (e.g., CS1010)`
      );
    }
  }

  /**
   * Validate non-empty string
   */
  static validateNonEmpty(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new ValidationError(fieldName, "must not be empty");
    }
  }

  /**
   * Validate positive integer
   */
  static validatePositiveInteger(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new ValidationError(fieldName, `must be a positive integer, got ${value}`);
    }
  }

  /**
   * Validate date is in future
   */
  static validateFutureDate(date: Date, fieldName: string): void {
    if (date <= new Date()) {
      throw new ValidationError(fieldName, "must be in the future");
    }
  }

  /**
   * Validate date range
   */
  static validateDateRange(start: Date, end: Date, fieldName: string): void {
    if (start >= end) {
      throw new ValidationError(fieldName, "start date must be before end date");
    }
  }
}
