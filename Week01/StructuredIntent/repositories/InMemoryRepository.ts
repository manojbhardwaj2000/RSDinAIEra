import { Student } from "../models/Student";
import { Course } from "../models/Course";
import { Enrolment } from "../models/Enrolment";
import {
  IStudentRepository,
  ICourseRepository,
  IEnrolmentRepository,
  IUnitOfWork,
  ITransaction,
} from "./IRepository";

/**
 * In-memory implementation of Student Repository
 */
export class InMemoryStudentRepository implements IStudentRepository {
  private students: Map<string, Student> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async save(student: Student): Promise<void> {
    const existingStudent = this.students.get(student.getId());
    if (existingStudent && existingStudent.getEmail() !== student.getEmail()) {
      this.emailIndex.delete(existingStudent.getEmail());
    }
    this.students.set(student.getId(), student);
    this.emailIndex.set(student.getEmail(), student.getId());
  }

  async findById(studentId: string): Promise<Student | null> {
    return this.students.get(studentId) || null;
  }

  async findByEmail(email: string): Promise<Student | null> {
    const studentId = this.emailIndex.get(email);
    return studentId ? this.students.get(studentId) || null : null;
  }

  async findAll(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async delete(studentId: string): Promise<void> {
    const student = this.students.get(studentId);
    if (student) {
      this.emailIndex.delete(student.getEmail());
      this.students.delete(studentId);
    }
  }

  async exists(studentId: string): Promise<boolean> {
    return this.students.has(studentId);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.emailIndex.has(email);
  }
}

/**
 * In-memory implementation of Course Repository
 */
export class InMemoryCourseRepository implements ICourseRepository {
  private courses: Map<string, Course> = new Map();

  async save(course: Course): Promise<void> {
    this.courses.set(course.getId(), course);
  }

  async findById(courseId: string): Promise<Course | null> {
    return this.courses.get(courseId) || null;
  }

  async findAll(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async delete(courseId: string): Promise<void> {
    this.courses.delete(courseId);
  }

  async exists(courseId: string): Promise<boolean> {
    return this.courses.has(courseId);
  }
}

/**
 * In-memory implementation of Enrolment Repository
 */
export class InMemoryEnrolmentRepository implements IEnrolmentRepository {
  private enrolments: Map<string, Enrolment> = new Map(); // key: "studentId:courseId"
  private studentIndex: Map<string, Set<string>> = new Map(); // studentId -> courseIds
  private courseIndex: Map<string, Set<string>> = new Map(); // courseId -> studentIds

  private makeKey(studentId: string, courseId: string): string {
    return `${studentId}:${courseId}`;
  }

  async save(enrolment: Enrolment): Promise<void> {
    const key = this.makeKey(enrolment.getStudentId(), enrolment.getCourseId());

    // Update student index
    if (!this.studentIndex.has(enrolment.getStudentId())) {
      this.studentIndex.set(enrolment.getStudentId(), new Set());
    }
    this.studentIndex.get(enrolment.getStudentId())!.add(enrolment.getCourseId());

    // Update course index
    if (!this.courseIndex.has(enrolment.getCourseId())) {
      this.courseIndex.set(enrolment.getCourseId(), new Set());
    }
    this.courseIndex.get(enrolment.getCourseId())!.add(enrolment.getStudentId());

    // Save enrolment
    this.enrolments.set(key, enrolment);
  }

  async findByStudentAndCourse(
    studentId: string,
    courseId: string
  ): Promise<Enrolment | null> {
    const key = this.makeKey(studentId, courseId);
    return this.enrolments.get(key) || null;
  }

  async findByStudent(studentId: string): Promise<Enrolment[]> {
    const courseIds = this.studentIndex.get(studentId) || new Set();
    return Array.from(courseIds)
      .map((courseId) => this.enrolments.get(this.makeKey(studentId, courseId))!)
      .filter((e) => e !== undefined);
  }

  async findByCourse(courseId: string): Promise<Enrolment[]> {
    const studentIds = this.courseIndex.get(courseId) || new Set();
    return Array.from(studentIds)
      .map((studentId) => this.enrolments.get(this.makeKey(studentId, courseId))!)
      .filter((e) => e !== undefined);
  }

  async delete(studentId: string, courseId: string): Promise<void> {
    const key = this.makeKey(studentId, courseId);
    this.enrolments.delete(key);

    // Update student index
    const studentCourses = this.studentIndex.get(studentId);
    if (studentCourses) {
      studentCourses.delete(courseId);
    }

    // Update course index
    const courseStudents = this.courseIndex.get(courseId);
    if (courseStudents) {
      courseStudents.delete(studentId);
    }
  }

  async exists(studentId: string, courseId: string): Promise<boolean> {
    const key = this.makeKey(studentId, courseId);
    return this.enrolments.has(key);
  }
}

/**
 * In-memory transaction implementation
 */
class InMemoryTransaction implements ITransaction {
  private committed = false;
  private rolledBack = false;

  async commit(): Promise<void> {
    this.committed = true;
  }

  async rollback(): Promise<void> {
    this.rolledBack = true;
  }

  isCommitted(): boolean {
    return this.committed;
  }

  isRolledBack(): boolean {
    return this.rolledBack;
  }
}

/**
 * In-memory Unit of Work implementation
 */
export class InMemoryUnitOfWork implements IUnitOfWork {
  private studentRepo: InMemoryStudentRepository;
  private courseRepo: InMemoryCourseRepository;
  private enrolmentRepo: InMemoryEnrolmentRepository;
  private currentTransaction: InMemoryTransaction | null = null;

  constructor() {
    this.studentRepo = new InMemoryStudentRepository();
    this.courseRepo = new InMemoryCourseRepository();
    this.enrolmentRepo = new InMemoryEnrolmentRepository();
  }

  getStudentRepository(): IStudentRepository {
    return this.studentRepo;
  }

  getCourseRepository(): ICourseRepository {
    return this.courseRepo;
  }

  getEnrolmentRepository(): IEnrolmentRepository {
    return this.enrolmentRepo;
  }

  async beginTransaction(): Promise<ITransaction> {
    this.currentTransaction = new InMemoryTransaction();
    return this.currentTransaction;
  }

  async commit(): Promise<void> {
    if (this.currentTransaction) {
      await this.currentTransaction.commit();
      this.currentTransaction = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.currentTransaction) {
      await this.currentTransaction.rollback();
      this.currentTransaction = null;
    }
  }
}
