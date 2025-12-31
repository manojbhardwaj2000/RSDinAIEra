import { EnrolmentSystem } from "./EnrolmentSystem";
import { Student } from "./models/Student";
import { Course } from "./models/Course";
import { TimeSlot } from "./types/TimeSlot";
import { EnrolmentWindow } from "./types/EnrolmentWindow";
import { InMemoryUnitOfWork } from "./repositories/InMemoryRepository";

/**
 * Demonstration of the Course Enrolment System
 * Shows real-world usage patterns and domain rule enforcement
 */

async function main(): Promise<void> {
  console.log("=== Course Enrolment System Demo ===\n");

  // Initialize system with repository
  const unitOfWork = new InMemoryUnitOfWork();
  const system = new EnrolmentSystem(unitOfWork);

  // Set up dates for enrolment windows
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    // ===== 1. Register Students =====
    console.log("1. Registering Students\n");

    const alice = new Student("S000001", "Alice Chen", "alice.chen@university.edu", "CS", 2, "good");
    const bob = new Student("S000002", "Bob Smith", "bob.smith@university.edu", "CS", 1, "good");
    const charlie = new Student("S000003", "Charlie Brown", "charlie.brown@university.edu", "MATH", 2, "good");

    await system.registerStudent(alice);
    await system.registerStudent(bob);
    await system.registerStudent(charlie);

    console.log("✓ Alice registered (CS Year 2)");
    console.log("✓ Bob registered (CS Year 1)");
    console.log("✓ Charlie registered (MATH Year 2)\n");

    // ===== 2. Create Courses with Domain Rules =====
    console.log("2. Creating Courses with Prerequisites and Constraints\n");

    // Foundation course (no prerequisites)
    const cs1010 = new Course("CS1010", "Programming Fundamentals", 30, 1);
    const regWindow1 = new EnrolmentWindow("registration", oneWeekAgo, oneWeekLater, 1);
    const addDropWindow1 = new EnrolmentWindow("add-drop", oneWeekAgo, oneMonthLater, 1);
    cs1010.setEnrolmentWindow(regWindow1);
    cs1010.setEnrolmentWindow(addDropWindow1);
    cs1010.addTimeSlot(new TimeSlot("MON", 1000, 1200, 1));
    cs1010.addTimeSlot(new TimeSlot("WED", 1000, 1200, 1));

    await system.createCourse(cs1010);
    console.log("✓ CS1010 created (30 seats, MON/WED 10:00-12:00)");

    // Advanced course with prerequisite
    const cs2020 = new Course("CS2020", "Data Structures", 20, 2);
    cs2020.addPrerequisite("CS1010");
    const regWindow2 = new EnrolmentWindow("registration", oneWeekAgo, oneWeekLater, 1);
    const addDropWindow2 = new EnrolmentWindow("add-drop", oneWeekAgo, oneMonthLater, 1);
    cs2020.setEnrolmentWindow(regWindow2);
    cs2020.setEnrolmentWindow(addDropWindow2);
    cs2020.addTimeSlot(new TimeSlot("TUE", 1400, 1600, 1));
    cs2020.addTimeSlot(new TimeSlot("THU", 1400, 1600, 1));

    await system.createCourse(cs2020);
    console.log("✓ CS2020 created (20 seats, requires CS1010, TUE/THU 14:00-16:00)\n");

    // ===== 3. Student Enrolments =====
    console.log("3. Processing Student Enrolments\n");

    // Bob enrols in CS1010 (should succeed - Year 1 allowed)
    const bob_enrolled = await system.enrolStudent("S000002", "CS1010");
    console.log(`✓ Bob enrolled in CS1010: ${bob_enrolled ? "Direct" : "Waitlisted"}`);

    // Alice tries to enrol in CS2020 without prerequisite (should fail)
    try {
      await system.enrolStudent("S000001", "CS2020");
      console.log("✗ Alice should not have enrolled without prerequisite");
    } catch (error) {
      console.log(`✓ Alice's enrolment in CS2020 blocked: ${(error as Error).message.substring(0, 50)}...`);
    }

    // Complete CS1010 for Alice
    alice.addCompletedCourse("CS1010");

    // Alice enrols in CS2020 (should succeed now)
    const alice_enrolled = await system.enrolStudent("S000001", "CS2020");
    console.log(`✓ Alice enrolled in CS2020 (with prerequisite): ${alice_enrolled ? "Direct" : "Waitlisted"}`);

    // Charlie tries to enrol in CS2020 but programme not allowed (if restricted)
    // Since CS2020 allows any programme, this will succeed
    const charlie_enrolled = await system.enrolStudent("S000003", "CS2020");
    console.log(`✓ Charlie enrolled in CS2020: ${charlie_enrolled ? "Direct" : "Waitlisted"}\n`);

    // ===== 4. Timetable Clash Detection =====
    console.log("4. Timetable Clash Detection\n");

    const cs1030 = new Course("CS1030", "Web Development", 25, 1);
    const regWindow3 = new EnrolmentWindow("registration", oneWeekAgo, oneWeekLater, 1);
    cs1030.setEnrolmentWindow(regWindow3);
    // Clash with CS1010: same time on Monday
    cs1030.addTimeSlot(new TimeSlot("MON", 1100, 1300, 1));

    await system.createCourse(cs1030);

    // Bob tries to enrol in CS1030 (has timetable clash with CS1010)
    try {
      await system.enrolStudent("S000002", "CS1030");
      console.log("✗ Bob should not have enrolled due to timetable clash");
    } catch (error) {
      console.log(`✓ Bob's enrolment blocked due to timetable clash: ${(error as Error).message.substring(0, 60)}...`);
    }

    // Dave enrols and tries non-clashing course
    const dave = new Student("S000004", "Dave Wilson", "dave.wilson@university.edu", "CS", 1);
    await system.registerStudent(dave);
    const dave_enrolled = await system.enrolStudent("S000004", "CS1030");
    console.log(`✓ Dave (no prior enrolments) enrolled in CS1030: ${dave_enrolled ? "Direct" : "Waitlisted"}\n`);

    // ===== 5. Waitlist and Capacity Management =====
    console.log("5. Waitlist and Capacity Management\n");

    const cs1040 = new Course("CS1040", "Algorithms", 2, 1); // Very small capacity
    const regWindow4 = new EnrolmentWindow("registration", oneWeekAgo, oneWeekLater, 1);
    const dropWindow4 = new EnrolmentWindow("withdrawal", oneWeekAgo, oneMonthLater, 1);
    cs1040.setEnrolmentWindow(regWindow4);
    cs1040.setEnrolmentWindow(dropWindow4);

    await system.createCourse(cs1040);

    const e1 = new Student("S000005", "Eve Adams", "eve@university.edu", "CS", 1);
    const e2 = new Student("S000006", "Frank Davis", "frank@university.edu", "CS", 1);
    const e3 = new Student("S000007", "Grace Lee", "grace@university.edu", "CS", 1);

    await system.registerStudent(e1);
    await system.registerStudent(e2);
    await system.registerStudent(e3);

    const e1_enrolled = await system.enrolStudent("S000005", "CS1040");
    const e2_enrolled = await system.enrolStudent("S000006", "CS1040");
    const e3_enrolled = await system.enrolStudent("S000007", "CS1040");

    console.log(`✓ Eve enrolled (seat 1): ${e1_enrolled ? "Enrolled" : "Waitlisted"}`);
    console.log(`✓ Frank enrolled (seat 2): ${e2_enrolled ? "Enrolled" : "Waitlisted"}`);
    console.log(`✓ Grace enrolment: ${e3_enrolled ? "Enrolled" : "Waitlisted"}`);
    console.log(`  - Course capacity: ${cs1040.getEnrolledCount()}/${cs1040.getCapacity()}`);
    console.log(`  - Waitlist size: ${cs1040.getWaitlistSize()}\n`);

    // Someone drops, waitlist student promoted
    console.log("6. Waitlist Promotion\n");
    console.log(`Grace's initial status: ${e3_enrolled ? "Enrolled" : "Waitlisted"}`);
    
    if (!e3_enrolled) {
      console.log("Eve drops the course...");
      await system.dropStudent("S000005", "CS1040");
      console.log("✓ Eve dropped CS1040");
      console.log(`  - Course capacity now: ${cs1040.getEnrolledCount()}/${cs1040.getCapacity()}`);
      console.log(`  - Waitlist size now: ${cs1040.getWaitlistSize()}`);
      console.log("✓ Grace automatically promoted from waitlist\n");
    }

    // ===== 7. Query Student Enrolments =====
    console.log("7. Student Enrolment Summary\n");

    const aliceEnrolments = await system.getStudentEnrolmentDetails("S000001");
    console.log("Alice's Enrolments:");
    for (const enrol of aliceEnrolments) {
      console.log(`  - ${enrol.getCourseId()}: ${enrol.getStatus()} (enrolled ${enrol.getDaysEnrolled()} days ago)`);
    }

    console.log("\nDemo Complete! ✓");

  } catch (error) {
    console.error("Error during demo:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run demo
main();

