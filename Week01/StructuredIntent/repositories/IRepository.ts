import { Student } from "../models/Student";
import { Course } from "../models/Course";
import { Enrolment } from "../models/Enrolment";

/**
 * Repository interface for Student persistence
 */
export interface IStudentRepository {
  save(student: Student): Promise<void>;
  findById(studentId: string): Promise<Student | null>;
  findByEmail(email: string): Promise<Student | null>;
  findAll(): Promise<Student[]>;
  delete(studentId: string): Promise<void>;
  exists(studentId: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
}

/**
 * Repository interface for Course persistence
 */
export interface ICourseRepository {
  save(course: Course): Promise<void>;
  findById(courseId: string): Promise<Course | null>;
  findAll(): Promise<Course[]>;
  delete(courseId: string): Promise<void>;
  exists(courseId: string): Promise<boolean>;
}

/**
 * Repository interface for Enrolment persistence
 */
export interface IEnrolmentRepository {
  save(enrolment: Enrolment): Promise<void>;
  findByStudentAndCourse(studentId: string, courseId: string): Promise<Enrolment | null>;
  findByStudent(studentId: string): Promise<Enrolment[]>;
  findByCourse(courseId: string): Promise<Enrolment[]>;
  delete(studentId: string, courseId: string): Promise<void>;
  exists(studentId: string, courseId: string): Promise<boolean>;
}

/**
 * Transaction interface for atomic operations
 */
export interface ITransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Unit of Work pattern for coordinating atomic operations
 */
export interface IUnitOfWork {
  getStudentRepository(): IStudentRepository;
  getCourseRepository(): ICourseRepository;
  getEnrolmentRepository(): IEnrolmentRepository;
  beginTransaction(): Promise<ITransaction>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
