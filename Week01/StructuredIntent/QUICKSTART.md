# Quick Start Guide

## Installation & Setup

```bash
# Clone or navigate to project
cd Week01/VagueIntent

# Install TypeScript (if needed)
npm install -g typescript

# Compile TypeScript
tsc

# Run tests
node EnrolmentSystem.test.js

# Run demo
node demo.js
```

## 5-Minute Tutorial

### 1. Create a System
```typescript
import { EnrolmentSystem } from "./EnrolmentSystem";
import { InMemoryUnitOfWork } from "./repositories/InMemoryRepository";

const unitOfWork = new InMemoryUnitOfWork();
const system = new EnrolmentSystem(unitOfWork);
```

### 2. Register a Student
```typescript
import { Student } from "./models/Student";

const student = new Student(
  "S123456",      // ID: must be S + 6 digits
  "Alice Chen",   // Name
  "alice@test.com", // Email: must be valid format
  "CS",           // Programme
  2,              // Year (1-4)
  "good"          // Academic standing: good, probation, or suspended
);

await system.registerStudent(student);
```

### 3. Create a Course
```typescript
import { Course } from "./models/Course";
import { TimeSlot } from "./types/TimeSlot";
import { EnrolmentWindow } from "./types/EnrolmentWindow";

const course = new Course(
  "CS1010",        // ID: 2-4 letters + 3-4 digits
  "Programming",   // Name
  30,              // Capacity
  1,               // Minimum year required
  ["CS", "MATH"]   // Allowed programmes (optional)
);

// Add timetable
course.addTimeSlot(new TimeSlot("MON", 1000, 1200, 1)); // Monday 10:00-12:00, Semester 1
course.addTimeSlot(new TimeSlot("WED", 1000, 1200, 1)); // Wednesday 10:00-12:00

// Set enrolment windows
const now = new Date();
const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const regWindow = new EnrolmentWindow("registration", now, oneWeek, 1);
const addDropWindow = new EnrolmentWindow("add-drop", now, oneMonth, 1);
const withdrawalWindow = new EnrolmentWindow("withdrawal", now, oneMonth, 1);

course.setEnrolmentWindow(regWindow);
course.setEnrolmentWindow(addDropWindow);
course.setEnrolmentWindow(withdrawalWindow);

await system.createCourse(course);
```

### 4. Enrol a Student
```typescript
// Simple case: all validations pass
const enrolled = await system.enrolStudent("S123456", "CS1010");
console.log(enrolled); // true (directly enrolled) or false (on waitlist)

// With error handling
try {
  await system.enrolStudent("S123456", "CS1010");
} catch (error) {
  if (error instanceof AlreadyEnrolledError) {
    console.log("Student already enrolled");
  } else if (error instanceof PrerequisiteNotMetError) {
    console.log("Missing prerequisites");
  } else if (error instanceof TimetableClashError) {
    console.log("Timetable clash detected");
  }
  // ... handle other errors
}
```

### 5. Add Prerequisites
```typescript
const cs2020 = new Course("CS2020", "Data Structures", 20, 2);
cs2020.addPrerequisite("CS1010");
cs2020.addPrerequisite("MATH1020");

await system.createCourse(cs2020);

// Student cannot enrol without completing prerequisites
// First complete the course:
student.addCompletedCourse("CS1010");
student.addCompletedCourse("MATH1020");

// Now can enrol
await system.enrolStudent("S123456", "CS2020");
```

### 6. Handle Capacity & Waitlist
```typescript
const smallCourse = new Course("CS1040", "Algorithms", 2); // Very small capacity

// Create some students
const alice = new Student("S111111", "Alice", "alice@test.com", "CS", 1);
const bob = new Student("S222222", "Bob", "bob@test.com", "CS", 1);
const charlie = new Student("S333333", "Charlie", "charlie@test.com", "CS", 1);

await system.registerStudent(alice);
await system.registerStudent(bob);
await system.registerStudent(charlie);
await system.createCourse(smallCourse);

// Fill the course
const enrol1 = await system.enrolStudent("S111111", "CS1040"); // true (enrolled)
const enrol2 = await system.enrolStudent("S222222", "CS1040"); // true (enrolled)
const enrol3 = await system.enrolStudent("S333333", "CS1040"); // false (waitlisted)

// Someone drops, next student auto-promoted
await system.dropStudent("S111111", "CS1040");
// Charlie is now enrolled!
```

### 7. Handle Timetable Clashes
```typescript
const course1 = new Course("CS1010", "Programming", 30);
course1.addTimeSlot(new TimeSlot("MON", 1000, 1200, 1));

const course2 = new Course("CS1020", "Web Dev", 30);
course2.addTimeSlot(new TimeSlot("MON", 1100, 1300, 1)); // Overlaps!

// First enrolment OK
await system.enrolStudent("S123456", "CS1010");

// Second fails (clash)
try {
  await system.enrolStudent("S123456", "CS1020");
} catch (error) {
  console.log(error instanceof TimetableClashError); // true
}
```

### 8. Query Data
```typescript
// Get student details
const student = await system.getStudent("S123456");
console.log(student.getName());
console.log(student.getYear());
console.log(student.getAcademicStanding());

// Get course details
const course = await system.getCourse("CS1010");
console.log(course.getEnrolledCount());
console.log(course.getCapacity());
console.log(course.isAvailable());

// Get student's enrolments
const enrolments = await system.getStudentEnrolmentDetails("S123456");
enrolments.forEach(e => {
  console.log(`${e.getCourseId()}: ${e.getStatus()}`);
});

// Get students in course
const students = await system.getStudentsInCourse("CS1010");
console.log(`${students.length} students enrolled`);

// Get waitlist
const waitlist = await system.getCourseWaitlist("CS1010");
console.log(`Waitlist: ${waitlist.join(", ")}`);
```

## Common Patterns

### Pattern 1: Set Up a Full Semester

```typescript
async function setupSemester() {
  const unitOfWork = new InMemoryUnitOfWork();
  const system = new EnrolmentSystem(unitOfWork);
  
  const now = new Date();
  const semesterStart = new Date(now.getFullYear(), 0, 10); // Jan 10
  const regEnd = new Date(now.getFullYear(), 0, 24);        // Jan 24
  const addDropEnd = new Date(now.getFullYear(), 0, 31);    // Jan 31
  const withdrawalEnd = new Date(now.getFullYear(), 2, 31); // Mar 31
  
  // Create courses
  const cs1010 = new Course("CS1010", "Programming", 50, 1);
  const cs2020 = new Course("CS2020", "Data Structures", 40, 2);
  
  cs2020.addPrerequisite("CS1010");
  
  // Set windows
  [cs1010, cs2020].forEach(course => {
    course.setEnrolmentWindow(new EnrolmentWindow("registration", semesterStart, regEnd, 1));
    course.setEnrolmentWindow(new EnrolmentWindow("add-drop", regEnd, addDropEnd, 1));
    course.setEnrolmentWindow(new EnrolmentWindow("withdrawal", addDropEnd, withdrawalEnd, 1));
  });
  
  // Add timetables
  cs1010.addTimeSlot(new TimeSlot("MON", 1000, 1200, 1));
  cs1010.addTimeSlot(new TimeSlot("WED", 1000, 1200, 1));
  cs2020.addTimeSlot(new TimeSlot("TUE", 1400, 1600, 1));
  cs2020.addTimeSlot(new TimeSlot("THU", 1400, 1600, 1));
  
  await system.createCourse(cs1010);
  await system.createCourse(cs2020);
  
  return system;
}
```

### Pattern 2: Bulk Enrolment with Error Handling

```typescript
async function bulkEnrol(system, studentIds, courseId) {
  const results = {
    succeeded: [],
    failed: []
  };
  
  for (const studentId of studentIds) {
    try {
      const enrolled = await system.enrolStudent(studentId, courseId);
      results.succeeded.push({
        studentId,
        enrolled,
        status: enrolled ? "enrolled" : "waitlisted"
      });
    } catch (error) {
      results.failed.push({
        studentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return results;
}
```

### Pattern 3: Check Student Eligibility

```typescript
async function canEnrol(system, studentId, courseId) {
  try {
    const student = await system.getStudent(studentId);
    const course = await system.getCourse(courseId);
    
    // Check suspensions
    if (!student.isEligible()) return "Student account suspended";
    
    // Check year
    if (student.getYear() < course.getMinimumYear()) {
      return `Year ${student.getYear()} < required ${course.getMinimumYear()}`;
    }
    
    // Check programme
    const allowedProgrammes = course.getAllowedProgrammes();
    if (allowedProgrammes.length > 0 && 
        !allowedProgrammes.includes(student.getProgramme())) {
      return `Programme not allowed`;
    }
    
    return null; // Can enrol
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
```

## Error Handling Reference

```typescript
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
  WaitlistFullError,
} from "./types/Errors";

try {
  await system.enrolStudent(studentId, courseId);
} catch (error) {
  if (error instanceof StudentNotFoundError) {
    // Handle missing student
  } else if (error instanceof CourseNotFoundError) {
    // Handle missing course
  } else if (error instanceof AlreadyEnrolledError) {
    // Handle duplicate enrolment
  } else if (error instanceof PrerequisiteNotMetError) {
    // Handle missing prerequisite
    const err = error as PrerequisiteNotMetError;
    console.log(`Missing: ${err.message}`);
  } else if (error instanceof TimetableClashError) {
    // Handle schedule conflict
  } else if (error instanceof EnrolmentWindowClosedError) {
    // Handle closed enrolment period
  } else if (error instanceof StudentIneligibleError) {
    // Handle eligibility issues
  } else {
    // Handle other errors
  }
}
```

## ID Format Reference

```typescript
// Student ID: S + 6 digits
const validStudentIds = ["S000001", "S123456", "S999999"];
const invalidStudentIds = ["S00001", "s123456", "123456"];

// Course ID: 2-4 letters + 3-4 digits
const validCourseIds = ["CS1010", "PHYS2020", "MATH101", "ENGL3001"];
const invalidCourseIds = ["C1010", "CS10", "CS10101"];

// Email: standard email format
const validEmails = ["alice@test.com", "bob.smith@university.edu"];
const invalidEmails = ["alice@test", "alice@.com"];

// Academic Standing
const standings = ["good", "probation", "suspended"];

// Programmes
const programmes = ["CS", "MATH", "PHYS", "CHEM", "ENGL"];

// Years
const years = [1, 2, 3, 4];

// Days
const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Time format (HHMM)
const validTimes = [800, 1030, 1400, 1530, 1800];
const invalidTimes = [2500, -100]; // Out of 0-2359 range
```

## Next Steps

1. **Read** [README.md](README.md) for full feature overview
2. **Study** [ARCHITECTURE.md](ARCHITECTURE.md) for system design
3. **Check** [IMPLEMENTATION.md](IMPLEMENTATION.md) for requirement coverage
4. **Review** [EnrolmentSystem.test.ts](EnrolmentSystem.test.ts) for test examples
5. **Run** [demo.ts](demo.ts) for real-world usage patterns
