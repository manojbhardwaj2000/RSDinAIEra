import { Student } from "./models/Student";
import { Course } from "./models/Course";

/**
 * Manages student enrolments in courses
 */
export class EnrolmentSystem {
  private students: Map<string, Student>;
  private courses: Map<string, Course>;
  private studentCourses: Map<string, Set<string>>; // studentId -> set of courseIds

  constructor() {
    this.students = new Map();
    this.courses = new Map();
    this.studentCourses = new Map();
  }

  /**
   * Register a new student in the system
   */
  registerStudent(student: Student): void {
    if (this.students.has(student.getId())) {
      throw new Error(`Student with id ${student.getId()} already exists`);
    }
    this.students.set(student.getId(), student);
    this.studentCourses.set(student.getId(), new Set());
  }

  /**
   * Create a new course in the system
   */
  createCourse(course: Course): void {
    if (this.courses.has(course.getId())) {
      throw new Error(`Course with id ${course.getId()} already exists`);
    }
    this.courses.set(course.getId(), course);
  }

  /**
   * Enrol a student in a course
   */
  enrolStudent(studentId: string, courseId: string): boolean {
    const student = this.students.get(studentId);
    if (!student) {
      throw new Error(`Student with id ${studentId} not found`);
    }

    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    // Check if already enrolled
    if (this.isStudentEnrolledInCourse(studentId, courseId)) {
      throw new Error(
        `Student ${studentId} is already enrolled in course ${courseId}`
      );
    }

    // Attempt to enrol
    if (course.enrollStudent(student)) {
      this.studentCourses.get(studentId)!.add(courseId);
      return true;
    }

    // Course is at capacity
    throw new Error(
      `Cannot enrol student ${studentId} in course ${courseId}: course is at capacity`
    );
  }

  /**
   * Drop a student from a course
   */
  dropStudent(studentId: string, courseId: string): boolean {
    const student = this.students.get(studentId);
    if (!student) {
      throw new Error(`Student with id ${studentId} not found`);
    }

    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    if (course.dropStudent(studentId)) {
      this.studentCourses.get(studentId)!.delete(courseId);
      return true;
    }

    return false;
  }

  /**
   * Get all students enrolled in a course
   */
  getStudentsInCourse(courseId: string): Student[] {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }
    return course.getEnrolledStudents();
  }

  /**
   * Get all courses a student is enrolled in
   */
  getCoursesForStudent(studentId: string): Course[] {
    const student = this.students.get(studentId);
    if (!student) {
      throw new Error(`Student with id ${studentId} not found`);
    }

    const courseIds = this.studentCourses.get(studentId) || new Set();
    return Array.from(courseIds)
      .map((courseId) => this.courses.get(courseId)!)
      .filter((course) => course !== undefined);
  }

  /**
   * Check if a student is enrolled in a course
   */
  isStudentEnrolledInCourse(studentId: string, courseId: string): boolean {
    const courseSet = this.studentCourses.get(studentId);
    return courseSet ? courseSet.has(courseId) : false;
  }

  /**
   * Get a student by id
   */
  getStudent(studentId: string): Student | undefined {
    return this.students.get(studentId);
  }

  /**
   * Get a course by id
   */
  getCourse(courseId: string): Course | undefined {
    return this.courses.get(courseId);
  }

  /**
   * Get all registered students
   */
  getAllStudents(): Student[] {
    return Array.from(this.students.values());
  }

  /**
   * Get all courses
   */
  getAllCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  /**
   * Get course availability status
   */
  getCourseAvailability(courseId: string): {
    courseId: string;
    courseName: string;
    available: number;
    capacity: number;
  } {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    return {
      courseId: course.getId(),
      courseName: course.getName(),
      available: course.getCapacity() - course.getEnrolledCount(),
      capacity: course.getCapacity(),
    };
  }
}
