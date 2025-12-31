import { Student } from "./models/Student";
import { Course } from "./models/Course";
import { Enrolment } from "./models/Enrolment";
import { TimeSlot } from "./types/TimeSlot";
import {
  StudentNotFoundError,
  CourseNotFoundError,
  CourseFullError,
  AlreadyEnrolledError,
  PrerequisiteNotMetError,
  CoRequisiteNotMetError,
  TimetableClashError,
  EnrolmentWindowClosedError,
  StudentIneligibleError,
  DuplicateStudentError,
  DuplicateCourseError,
  WaitlistFullError,
  ValidationError,
} from "./types/Errors";
import { IUnitOfWork } from "./repositories/IRepository";

/**
 * Core enrolment system managing student-course relationships atomically
 * Enforces all domain rules and maintains invariants
 */
export class EnrolmentSystem {
  private unitOfWork: IUnitOfWork;

  constructor(unitOfWork: IUnitOfWork) {
    this.unitOfWork = unitOfWork;
  }

  /**
   * Register a new student in the system
   * Validates email and ID uniqueness
   */
  async registerStudent(student: Student): Promise<void> {
    const studentRepo = this.unitOfWork.getStudentRepository();

    // Check ID uniqueness
    if (await studentRepo.exists(student.getId())) {
      throw new DuplicateStudentError("ID", student.getId());
    }

    // Check email uniqueness
    if (await studentRepo.existsByEmail(student.getEmail())) {
      throw new DuplicateStudentError("email", student.getEmail());
    }

    await studentRepo.save(student);
  }

  /**
   * Create a new course in the system
   */
  async createCourse(course: Course): Promise<void> {
    const courseRepo = this.unitOfWork.getCourseRepository();

    if (await courseRepo.exists(course.getId())) {
      throw new DuplicateCourseError(course.getId());
    }

    await courseRepo.save(course);
  }

  /**
   * Get a student by ID
   */
  async getStudent(studentId: string): Promise<Student> {
    const studentRepo = this.unitOfWork.getStudentRepository();
    const student = await studentRepo.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }
    return student;
  }

  /**
   * Get a course by ID
   */
  async getCourse(courseId: string): Promise<Course> {
    const courseRepo = this.unitOfWork.getCourseRepository();
    const course = await courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(courseId);
    }
    return course;
  }

  /**
   * Enrol a student in a course with full validation
   * Atomic operation: either succeeds completely or fails
   */
  async enrolStudent(
    studentId: string,
    courseId: string,
    referenceDate: Date = new Date()
  ): Promise<boolean> {
    const transaction = await this.unitOfWork.beginTransaction();

    try {
      // 1. Fetch and validate entities exist
      const student = await this.getStudent(studentId);
      const course = await this.getCourse(courseId);

      // 2. Check student eligibility
      if (!student.isEligible()) {
        throw new StudentIneligibleError(
          studentId,
          courseId,
          `student account is ${student.getAcademicStanding()}`
        );
      }

      // 3. Check enrolment window
      const isRegistration = course.isEnrolmentWindowOpen("registration", referenceDate);
      const isAddDrop = course.isEnrolmentWindowOpen("add-drop", referenceDate);

      if (!isRegistration && !isAddDrop) {
        throw new EnrolmentWindowClosedError(
          courseId,
          isRegistration ? "add-drop" : "registration"
        );
      }

      // 4. Check not already enrolled
      const enrolmentRepo = this.unitOfWork.getEnrolmentRepository();
      if (await enrolmentRepo.exists(studentId, courseId)) {
        throw new AlreadyEnrolledError(studentId, courseId);
      }

      // 5. Check prerequisites
      const missingPrerequisites = this.checkPrerequisites(student, course);
      if (missingPrerequisites.length > 0) {
        throw new PrerequisiteNotMetError(studentId, courseId, missingPrerequisites);
      }

      // 6. Check co-requisites
      const missingCorequisites = this.checkCorequisites(student, course);
      if (missingCorequisites.length > 0) {
        throw new CoRequisiteNotMetError(studentId, courseId, missingCorequisites);
      }

      // 7. Check timetable clash
      const clashingCourses = await this.checkTimetableClash(student, course);
      if (clashingCourses.length > 0) {
        throw new TimetableClashError(studentId, courseId, clashingCourses);
      }

      // 8. Check year eligibility
      if (student.getYear() < course.getMinimumYear()) {
        throw new StudentIneligibleError(
          studentId,
          courseId,
          `student is in year ${student.getYear()}, course requires year ${course.getMinimumYear()}`
        );
      }

      // 9. Check programme eligibility
      const allowedProgrammes = course.getAllowedProgrammes();
      if (
        allowedProgrammes.length > 0 &&
        !allowedProgrammes.includes(student.getProgramme())
      ) {
        throw new StudentIneligibleError(
          studentId,
          courseId,
          `programme "${student.getProgramme()}" not allowed. Allowed: ${allowedProgrammes.join(", ")}`
        );
      }

      // 10. Try to enrol in course (atomic)
      const enrolled = course.enrollStudent(studentId);

      // 11. Create enrolment record
      const enrolment = new Enrolment(
        studentId,
        courseId,
        enrolled ? "active" : "waitlisted"
      );
      await enrolmentRepo.save(enrolment);

      // 12. Persist course changes
      const courseRepo = this.unitOfWork.getCourseRepository();
      await courseRepo.save(course);

      // 13. Persist student changes
      const studentRepo = this.unitOfWork.getStudentRepository();
      await studentRepo.save(student);

      // Commit transaction
      await this.unitOfWork.commit();

      return enrolled;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }

  /**
   * Drop a student from a course
   * Atomic operation with promotion from waitlist
   */
  async dropStudent(
    studentId: string,
    courseId: string,
    referenceDate: Date = new Date()
  ): Promise<void> {
    const transaction = await this.unitOfWork.beginTransaction();

    try {
      // Validate entities exist
      const student = await this.getStudent(studentId);
      const course = await this.getCourse(courseId);
      const enrolmentRepo = this.unitOfWork.getEnrolmentRepository();

      // Check enrolment exists
      const enrolment = await enrolmentRepo.findByStudentAndCourse(studentId, courseId);
      if (!enrolment) {
        throw new ValidationError("enrolment", `Student ${studentId} is not enrolled in course ${courseId}`);
      }

      // Check withdrawal window
      if (!course.isEnrolmentWindowOpen("withdrawal", referenceDate)) {
        throw new EnrolmentWindowClosedError(courseId, "withdrawal");
      }

      // Mark enrolment as dropped
      enrolment.markAsDropped();
      await enrolmentRepo.save(enrolment);

      // Drop from course (will promote from waitlist if needed)
      course.dropStudent(studentId);

      // Persist changes
      const courseRepo = this.unitOfWork.getCourseRepository();
      await courseRepo.save(course);

      // Commit transaction
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }

  /**
   * Get all students enrolled in a course
   */
  async getStudentsInCourse(courseId: string): Promise<Student[]> {
    const course = await this.getCourse(courseId);
    const studentRepo = this.unitOfWork.getStudentRepository();
    const studentIds = course.getEnrolledStudents();
    const students = await Promise.all(
      studentIds.map((id) => studentRepo.findById(id))
    );
    return students.filter((s) => s !== null) as Student[];
  }

  /**
   * Get all courses a student is enrolled in
   */
  async getStudentEnrolments(studentId: string): Promise<Course[]> {
    await this.getStudent(studentId); // Validate student exists
    const enrolmentRepo = this.unitOfWork.getEnrolmentRepository();
    const enrolments = await enrolmentRepo.findByStudent(studentId);
    const courseRepo = this.unitOfWork.getCourseRepository();

    const courses = await Promise.all(
      enrolments
        .filter((e) => e.isActive())
        .map((e) => courseRepo.findById(e.getCourseId()))
    );

    return courses.filter((c) => c !== null) as Course[];
  }

  /**
   * Get all enrolments for a student
   */
  async getStudentEnrolmentDetails(studentId: string): Promise<Enrolment[]> {
    await this.getStudent(studentId); // Validate student exists
    const enrolmentRepo = this.unitOfWork.getEnrolmentRepository();
    return enrolmentRepo.findByStudent(studentId);
  }

  /**
   * Get course waitlist
   */
  async getCourseWaitlist(courseId: string): Promise<string[]> {
    const course = await this.getCourse(courseId);
    return course.getWaitlist();
  }

  /**
   * Check if student has completed all prerequisites
   */
  private checkPrerequisites(student: Student, course: Course): string[] {
    const prerequisites = course.getPrerequisites();
    const missing = prerequisites.filter((prereq) => !student.hasCompletedCourse(prereq));
    return missing;
  }

  /**
   * Check if student meets all co-requisite requirements
   */
  private checkCorequisites(student: Student, course: Course): string[] {
    const corequisites = course.getCorequisites();
    const missing = corequisites.filter(
      (coreq) => !student.hasCompletedCourse(coreq)
    );
    return missing;
  }

  /**
   * Check for timetable clashes with student's other enrolments
   */
  private async checkTimetableClash(
    student: Student,
    course: Course
  ): Promise<string[]> {
    const studentCourses = await this.getStudentEnrolments(student.getId());
    const courseTimeSlots = course.getTimeSlots();
    const clashes: string[] = [];

    for (const studentCourse of studentCourses) {
      const studentCourseSlots = studentCourse.getTimeSlots();
      for (const slot1 of courseTimeSlots) {
        for (const slot2 of studentCourseSlots) {
          if (slot1.clashWith(slot2)) {
            if (!clashes.includes(studentCourse.getId())) {
              clashes.push(studentCourse.getId());
            }
          }
        }
      }
    }

    return clashes;
  }
}

