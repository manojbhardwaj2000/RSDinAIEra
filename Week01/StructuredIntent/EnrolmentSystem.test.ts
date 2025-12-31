import { EnrolmentSystem } from "./EnrolmentSystem";
import { Student } from "./models/Student";
import { Course } from "./models/Course";
import { Enrolment } from "./models/Enrolment";
import { InMemoryUnitOfWork } from "./repositories/InMemoryRepository";
import { TimeSlot } from "./types/TimeSlot";
import { EnrolmentWindow } from "./types/EnrolmentWindow";
import {
  StudentNotFoundError,
  CourseNotFoundError,
  AlreadyEnrolledError,
  PrerequisiteNotMetError,
  CoRequisiteNotMetError,
  TimetableClashError,
  EnrolmentWindowClosedError,
  StudentIneligibleError,
  DuplicateStudentError,
  DuplicateCourseError,
  ValidationError,
} from "./types/Errors";

/**
 * Comprehensive test suite for the Enrolment System
 */

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(
  name: string,
  fn: () => Promise<void> | void
): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    console.log(`✗ ${name}: ${errorMsg}`);
  }
}

async function runTests(): Promise<void> {
  console.log("=== Comprehensive Enrolment System Tests ===\n");

  // ===== VALIDATION TESTS =====
  console.log("\n### Validation Tests ###\n");

  await test("Student ID validation - valid format", async () => {
    const student = new Student("S123456", "John", "john@test.com", "CS", 1);
    assert(student.getId() === "S123456", "ID should be valid");
  });

  await test("Student ID validation - invalid format", async () => {
    try {
      new Student("123456", "John", "john@test.com", "CS", 1);
      throw new Error("Should have thrown ValidationError");
    } catch (e) {
      assert(e instanceof ValidationError, "Should throw ValidationError");
    }
  });

  await test("Email validation - valid format", async () => {
    const student = new Student("S123456", "John", "john@test.com", "CS", 1);
    assert(student.getEmail() === "john@test.com", "Email should be valid");
  });

  await test("Email validation - invalid format", async () => {
    try {
      new Student("S123456", "John", "invalid-email", "CS", 1);
      throw new Error("Should have thrown ValidationError");
    } catch (e) {
      assert(e instanceof ValidationError, "Should throw ValidationError");
    }
  });

  await test("Course ID validation - valid format", async () => {
    const course = new Course("CS1010", "Programming", 30);
    assert(course.getId() === "CS1010", "Course ID should be valid");
  });

  await test("Course ID validation - invalid format", async () => {
    try {
      new Course("INVALID", "Course", 30);
      throw new Error("Should have thrown ValidationError");
    } catch (e) {
      assert(e instanceof ValidationError, "Should throw ValidationError");
    }
  });

  // ===== BASIC ENROLMENT TESTS =====
  console.log("\n### Basic Enrolment Tests ###\n");

  await test("Register student successfully", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);
    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);

    await system.registerStudent(student);
    const retrieved = await system.getStudent("S123456");
    assert(retrieved.getName() === "Alice", "Student should be registered");
  });

  await test("Prevent duplicate student ID", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);
    const student1 = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const student2 = new Student("S123456", "Bob", "bob@test.com", "CS", 1);

    await system.registerStudent(student1);
    try {
      await system.registerStudent(student2);
      throw new Error("Should have thrown DuplicateStudentError");
    } catch (e) {
      assert(e instanceof DuplicateStudentError, "Should throw DuplicateStudentError");
    }
  });

  await test("Prevent duplicate student email", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);
    const student1 = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const student2 = new Student("S654321", "Bob", "alice@test.com", "CS", 1);

    await system.registerStudent(student1);
    try {
      await system.registerStudent(student2);
      throw new Error("Should have thrown DuplicateStudentError");
    } catch (e) {
      assert(e instanceof DuplicateStudentError, "Should throw DuplicateStudentError");
    }
  });

  await test("Create course successfully", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);
    const course = new Course("CS1010", "Programming", 30);

    await system.createCourse(course);
    const retrieved = await system.getCourse("CS1010");
    assert(retrieved.getName() === "Programming", "Course should be created");
  });

  await test("Prevent duplicate course", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);
    const course1 = new Course("CS1010", "Programming", 30);
    const course2 = new Course("CS1010", "OOP", 25);

    await system.createCourse(course1);
    try {
      await system.createCourse(course2);
      throw new Error("Should have thrown DuplicateCourseError");
    } catch (e) {
      assert(e instanceof DuplicateCourseError, "Should throw DuplicateCourseError");
    }
  });

  // ===== ENROLMENT WINDOW TESTS =====
  console.log("\n### Enrolment Window Tests ###\n");

  await test("Enrol during registration window", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const course = new Course("CS1010", "Programming", 30);
    const regWindow = new EnrolmentWindow("registration", pastDate, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    const enrolled = await system.enrolStudent("S123456", "CS1010", now);
    assert(enrolled === true, "Student should be enrolled");
  });

  await test("Prevent enrolment outside enrolment windows", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const pastDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const closedDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const course = new Course("CS1010", "Programming", 30);
    const regWindow = new EnrolmentWindow("registration", pastDate, closedDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    try {
      await system.enrolStudent("S123456", "CS1010", now);
      throw new Error("Should have thrown EnrolmentWindowClosedError");
    } catch (e) {
      assert(e instanceof EnrolmentWindowClosedError, "Should throw EnrolmentWindowClosedError");
    }
  });

  // ===== PREREQUISITE TESTS =====
  console.log("\n### Prerequisite Tests ###\n");

  await test("Prevent enrolment without prerequisite", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 2);
    const course = new Course("CS2020", "Data Structures", 30);
    course.addPrerequisite("CS1010");

    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    try {
      await system.enrolStudent("S123456", "CS2020");
      throw new Error("Should have thrown PrerequisiteNotMetError");
    } catch (e) {
      assert(e instanceof PrerequisiteNotMetError, "Should throw PrerequisiteNotMetError");
    }
  });

  await test("Allow enrolment with prerequisite completed", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 2);
    student.addCompletedCourse("CS1010");

    const course = new Course("CS2020", "Data Structures", 30);
    course.addPrerequisite("CS1010");

    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    const enrolled = await system.enrolStudent("S123456", "CS2020");
    assert(enrolled === true, "Student should be enrolled with prerequisite");
  });

  // ===== CO-REQUISITE TESTS =====
  console.log("\n### Co-Requisite Tests ###\n");

  await test("Prevent enrolment without co-requisite", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 2);
    const course = new Course("CS2030", "Advanced Prog", 30);
    course.addCorequisite("CS2040");

    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    try {
      await system.enrolStudent("S123456", "CS2030");
      throw new Error("Should have thrown CoRequisiteNotMetError");
    } catch (e) {
      assert(e instanceof CoRequisiteNotMetError, "Should throw CoRequisiteNotMetError");
    }
  });

  // ===== TIMETABLE CLASH TESTS =====
  console.log("\n### Timetable Clash Tests ###\n");

  await test("Prevent enrolment with timetable clash", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const course1 = new Course("CS1010", "Programming", 30);
    const course2 = new Course("CS1020", "Web Dev", 30);

    const slot1 = new TimeSlot("MON", 1000, 1200, 1);
    const slot2 = new TimeSlot("MON", 1100, 1300, 1); // Overlaps with slot1

    course1.addTimeSlot(slot1);
    course2.addTimeSlot(slot2);

    const regWindow1 = new EnrolmentWindow("registration", now, futureDate, 1);
    const regWindow2 = new EnrolmentWindow("registration", now, futureDate, 1);
    course1.setEnrolmentWindow(regWindow1);
    course2.setEnrolmentWindow(regWindow2);

    await system.registerStudent(student);
    await system.createCourse(course1);
    await system.createCourse(course2);

    // First enrolment succeeds
    const enrolled1 = await system.enrolStudent("S123456", "CS1010");
    assert(enrolled1 === true, "First enrolment should succeed");

    // Second enrolment should fail due to clash
    try {
      await system.enrolStudent("S123456", "CS1020");
      throw new Error("Should have thrown TimetableClashError");
    } catch (e) {
      assert(e instanceof TimetableClashError, "Should throw TimetableClashError");
    }
  });

  await test("Allow enrolment without timetable clash", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const course1 = new Course("CS1010", "Programming", 30);
    const course2 = new Course("CS1020", "Web Dev", 30);

    const slot1 = new TimeSlot("MON", 1000, 1100, 1);
    const slot2 = new TimeSlot("MON", 1200, 1300, 1); // No overlap

    course1.addTimeSlot(slot1);
    course2.addTimeSlot(slot2);

    const regWindow1 = new EnrolmentWindow("registration", now, futureDate, 1);
    const regWindow2 = new EnrolmentWindow("registration", now, futureDate, 1);
    course1.setEnrolmentWindow(regWindow1);
    course2.setEnrolmentWindow(regWindow2);

    await system.registerStudent(student);
    await system.createCourse(course1);
    await system.createCourse(course2);

    const enrolled1 = await system.enrolStudent("S123456", "CS1010");
    const enrolled2 = await system.enrolStudent("S123456", "CS1020");

    assert(enrolled1 === true && enrolled2 === true, "Both enrolments should succeed");
  });

  // ===== ELIGIBILITY TESTS =====
  console.log("\n### Eligibility Tests ###\n");

  await test("Prevent enrolment for suspended student", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student(
      "S123456",
      "Alice",
      "alice@test.com",
      "CS",
      1,
      "suspended"
    );
    const course = new Course("CS1010", "Programming", 30);
    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    try {
      await system.enrolStudent("S123456", "CS1010");
      throw new Error("Should have thrown StudentIneligibleError");
    } catch (e) {
      assert(
        e instanceof StudentIneligibleError,
        "Should throw StudentIneligibleError"
      );
    }
  });

  await test("Prevent enrolment below minimum year requirement", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const course = new Course("CS3010", "Advanced", 30, 3); // Requires year 3
    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    try {
      await system.enrolStudent("S123456", "CS3010");
      throw new Error("Should have thrown StudentIneligibleError");
    } catch (e) {
      assert(
        e instanceof StudentIneligibleError,
        "Should throw StudentIneligibleError"
      );
    }
  });

  await test("Prevent enrolment in restricted programme", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 2);
    const course = new Course("PHYS2010", "Physics", 30, 1, ["PHYS"]);
    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    try {
      await system.enrolStudent("S123456", "PHYS2010");
      throw new Error("Should have thrown StudentIneligibleError");
    } catch (e) {
      assert(
        e instanceof StudentIneligibleError,
        "Should throw StudentIneligibleError"
      );
    }
  });

  // ===== CAPACITY AND WAITLIST TESTS =====
  console.log("\n### Capacity and Waitlist Tests ###\n");

  await test("Fill course to capacity and waitlist", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const course = new Course("CS1010", "Programming", 2); // Capacity 2
    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    const student1 = new Student("S111111", "Alice", "alice@test.com", "CS", 1);
    const student2 = new Student("S222222", "Bob", "bob@test.com", "CS", 1);
    const student3 = new Student("S333333", "Charlie", "charlie@test.com", "CS", 1);

    await system.registerStudent(student1);
    await system.registerStudent(student2);
    await system.registerStudent(student3);
    await system.createCourse(course);

    const enrol1 = await system.enrolStudent("S111111", "CS1010");
    const enrol2 = await system.enrolStudent("S222222", "CS1010");
    const enrol3 = await system.enrolStudent("S333333", "CS1010");

    assert(enrol1 === true && enrol2 === true && enrol3 === false,
      "First two should be enrolled, third on waitlist");
    assert(course.getEnrolledCount() === 2, "Course should have 2 enrolled");
    assert(course.getWaitlistSize() === 1, "Waitlist should have 1 student");
  });

  await test("Promote from waitlist when student drops", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const course = new Course("CS1010", "Programming", 2);
    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    const dropWindow = new EnrolmentWindow("withdrawal", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);
    course.setEnrolmentWindow(dropWindow);

    const student1 = new Student("S111111", "Alice", "alice@test.com", "CS", 1);
    const student2 = new Student("S222222", "Bob", "bob@test.com", "CS", 1);
    const student3 = new Student("S333333", "Charlie", "charlie@test.com", "CS", 1);

    await system.registerStudent(student1);
    await system.registerStudent(student2);
    await system.registerStudent(student3);
    await system.createCourse(course);

    await system.enrolStudent("S111111", "CS1010");
    await system.enrolStudent("S222222", "CS1010");
    const waitlisted = await system.enrolStudent("S333333", "CS1010");
    assert(waitlisted === false, "Third student should be waitlisted");

    // Drop first student
    await system.dropStudent("S111111", "CS1010");

    // Check that third student is now enrolled
    const waitlist = await system.getCourseWaitlist("CS1010");
    assert(
      waitlist.length === 0,
      "Waitlist should be empty after promotion"
    );
    assert(
      course.getEnrolledCount() === 2,
      "Course should still have 2 enrolled"
    );
  });

  // ===== ERROR TESTS =====
  console.log("\n### Error Handling Tests ###\n");

  await test("Get non-existent student throws error", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    try {
      await system.getStudent("S999999");
      throw new Error("Should have thrown StudentNotFoundError");
    } catch (e) {
      assert(
        e instanceof StudentNotFoundError,
        "Should throw StudentNotFoundError"
      );
    }
  });

  await test("Get non-existent course throws error", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    try {
      await system.getCourse("XX9999");
      throw new Error("Should have thrown CourseNotFoundError");
    } catch (e) {
      assert(
        e instanceof CourseNotFoundError,
        "Should throw CourseNotFoundError"
      );
    }
  });

  await test("Prevent double enrolment", async () => {
    const unitOfWork = new InMemoryUnitOfWork();
    const system = new EnrolmentSystem(unitOfWork);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
    const course = new Course("CS1010", "Programming", 30);
    const regWindow = new EnrolmentWindow("registration", now, futureDate, 1);
    course.setEnrolmentWindow(regWindow);

    await system.registerStudent(student);
    await system.createCourse(course);

    await system.enrolStudent("S123456", "CS1010");

    try {
      await system.enrolStudent("S123456", "CS1010");
      throw new Error("Should have thrown AlreadyEnrolledError");
    } catch (e) {
      assert(
        e instanceof AlreadyEnrolledError,
        "Should throw AlreadyEnrolledError"
      );
    }
  });

  // ===== SUMMARY =====
  console.log("\n=== Test Summary ===\n");
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed < total) {
    console.log("\nFailed tests:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

// Run all tests
runTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exit(1);
});
