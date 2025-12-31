# Course Enrolment System - Comprehensive Architecture

A production-grade course enrolment system built with TypeScript, implementing strict domain-driven design principles, atomic operations, and comprehensive validation.

## ✨ Key Features

### 1. **First-Class Enrolment Concept**
- `Enrolment` model as primary domain concept
- Atomic student-course relationships
- Separate `IEnrolmentRepository` for persistence
- Dual indexing (student-centric and course-centric) with consistency guarantees

### 2. **Domain Rules Enforcement**
- **Prerequisites**: Students must complete prerequisite courses before enrolment
- **Co-requisites**: Required concurrent course enrolments
- **Timetable Clash Detection**: Prevents scheduling conflicts (by day/time/semester)
- **Enrolment Windows**: Time-based constraints (registration, add-drop, withdrawal)
- **Student Eligibility**: Year requirement, programme restrictions, academic standing
- **Capacity Management**: Course capacity enforcement with automatic waitlisting
- **Waitlist Management**: Automatic promotion when seats become available

### 3. **Domain-Specific Error Types**
All errors inherit from `DomainError` for proper error handling:

```typescript
- StudentNotFoundError
- CourseNotFoundError
- CourseFullError
- AlreadyEnrolledError
- PrerequisiteNotMetError
- CoRequisiteNotMetError
- TimetableClashError
- EnrolmentWindowClosedError
- StudentIneligibleError
- DuplicateStudentError
- DuplicateCourseError
- ValidationError
- WaitlistFullError
```

### 4. **Strong Validation**
- **Email Format**: RFC-compliant validation (e.g., `alice@test.com`)
- **Student ID Format**: `S` + 6 digits (e.g., `S123456`)
- **Course ID Format**: 2-4 letters + 3-4 digits (e.g., `CS1010`, `PHYS2020`)
- **Uniqueness**: Email and ID uniqueness per student
- **Numeric Constraints**: Positive integers, GPA range (0-4.0), year range (1-4)

### 5. **Repository Pattern**
Complete separation of domain logic from persistence:

```typescript
IStudentRepository    // findById, findByEmail, findAll, save, exists
ICourseRepository     // findById, findAll, save, exists
IEnrolmentRepository  // findByStudent, findByCourse, findByStudentAndCourse
IUnitOfWork          // Transaction coordination
```

In-memory implementations provided:
- `InMemoryStudentRepository` - O(1) email lookup via index
- `InMemoryCourseRepository` - Direct ID mapping
- `InMemoryEnrolmentRepository` - Dual indexing (student + course)
- `InMemoryUnitOfWork` - Transaction coordination

### 6. **Atomic & Concurrency-Safe Operations**
- Transaction pattern with commit/rollback
- All state mutations are atomic
- Waitlist promotions atomic with drop operations
- Prevents race conditions and data inconsistencies

## 📁 Project Structure

```
VagueIntent/
├── models/
│   ├── Student.ts          # Student domain model with eligibility tracking
│   ├── Course.ts           # Course model with prerequisites, co-requisites, timetable
│   └── Enrolment.ts        # First-class Enrolment concept
├── types/
│   ├── Errors.ts           # Domain-specific error types
│   ├── Validators.ts       # Validation utilities
│   ├── TimeSlot.ts         # Timetable clash detection
│   └── EnrolmentWindow.ts  # Enrolment phase management
├── repositories/
│   ├── IRepository.ts      # Repository interfaces
│   └── InMemoryRepository.ts # In-memory implementations
├── EnrolmentSystem.ts      # Core enrolment system (orchestrator)
├── EnrolmentSystem.test.ts # Comprehensive test suite
└── demo.ts                 # Usage examples
```

## 🏗️ Architecture

### Domain Model Hierarchy
```
DomainError (abstract)
├── StudentNotFoundError
├── CourseNotFoundError
├── PrerequisiteNotMetError
├── CoRequisiteNotMetError
├── TimetableClashError
├── EnrolmentWindowClosedError
├── StudentIneligibleError
└── ... (see Errors.ts for full list)

Student (strong validation)
├── id (S + 6 digits)
├── email (RFC-compliant)
├── programme (CS, MATH, PHYS, etc.)
├── year (1-4)
├── academicStanding (good, probation, suspended)
└── completedCourses (Set<string>)

Course (strong validation)
├── id (XX + 4 digits)
├── capacity (positive integer)
├── prerequisites (Set<string>)
├── corequisites (Set<string>)
├── timeSlots (TimeSlot[])
├── enrolmentWindows (Map<phase, window>)
├── minimumYear (requirement)
└── allowedProgrammes (Set<string>)

Enrolment (first-class concept)
├── studentId
├── courseId
├── status (active, waitlisted, dropped)
├── enrolledDate
└── grade (optional)
```

### Repository Abstraction
```
IUnitOfWork (transaction coordination)
├── IStudentRepository
│   ├── save(student)
│   ├── findById(id)
│   ├── findByEmail(email)
│   ├── exists(id)
│   └── existsByEmail(email)
├── ICourseRepository
│   ├── save(course)
│   ├── findById(id)
│   └── exists(id)
└── IEnrolmentRepository
    ├── save(enrolment)
    ├── findByStudent(studentId)
    ├── findByCourse(courseId)
    └── findByStudentAndCourse(studentId, courseId)
```

## 🔄 Enrolment Workflow

### 1. Student Registration
```typescript
const student = new Student("S123456", "Alice", "alice@test.com", "CS", 2);
await system.registerStudent(student);
// Validates: ID format, email format, uniqueness
```

### 2. Course Creation with Rules
```typescript
const course = new Course("CS2020", "Data Structures", 30, 2);
course.addPrerequisite("CS1010");
course.addCorequisite("MATH2010");
course.addTimeSlot(new TimeSlot("MON", 1000, 1200, 1));

const regWindow = new EnrolmentWindow("registration", start, end, 1);
course.setEnrolmentWindow(regWindow);

await system.createCourse(course);
```

### 3. Enrolment with Validation
```typescript
// Validates (in order):
// 1. Student exists and is eligible
// 2. Course exists
// 3. Not already enrolled
// 4. All prerequisites completed
// 5. All co-requisites met
// 6. No timetable clashes
// 7. Student year >= course minimum year
// 8. Student programme allowed
// 9. Enrolment window open
// 10. Course has capacity OR waitlist has space

const enrolled = await system.enrolStudent("S123456", "CS2020");
// Returns: true (directly enrolled) or false (on waitlist)
```

### 4. Drop with Waitlist Promotion
```typescript
await system.dropStudent("S123456", "CS2020");
// Atomically:
// 1. Marks enrolment as dropped
// 2. Removes from course
// 3. Promotes first waitlisted student
```

## 📊 Validation Rules

| Field | Validation | Example |
|-------|-----------|---------|
| Student ID | `S` + 6 digits | `S123456` ✓, `123456` ✗ |
| Email | RFC format | `alice@test.com` ✓, `alice@test` ✗ |
| Course ID | 2-4 letters + 3-4 digits | `CS1010` ✓, `C01` ✗ |
| Year | 1-4 | `2` ✓, `5` ✗ |
| GPA | 0.0 - 4.0 | `3.5` ✓, `4.5` ✗ |
| Capacity | Positive integer | `30` ✓, `0` ✗ |

## 🧪 Test Coverage

Comprehensive test suite with 40+ tests covering:

### Validation Tests
- Student ID format validation
- Email format validation
- Course ID format validation
- Invalid input rejection

### Basic Functionality
- Student registration
- Duplicate student prevention
- Course creation
- Duplicate course prevention
- Get student/course queries

### Domain Rules
- Prerequisites enforcement
- Co-requisites enforcement
- Timetable clash detection
- Enrolment window enforcement
- Student year eligibility
- Programme restrictions
- Academic standing eligibility

### Capacity & Waitlist
- Course capacity enforcement
- Waitlist management
- Automatic promotion from waitlist
- Waitlist size limits

### Error Handling
- StudentNotFoundError
- CourseNotFoundError
- AlreadyEnrolledError
- PrerequisiteNotMetError
- TimetableClashError
- All domain-specific errors

## 🚀 Usage Examples

### Example 1: Basic Enrolment
```typescript
const unitOfWork = new InMemoryUnitOfWork();
const system = new EnrolmentSystem(unitOfWork);

const student = new Student("S123456", "Alice", "alice@test.com", "CS", 1);
const course = new Course("CS1010", "Programming", 30);

await system.registerStudent(student);
await system.createCourse(course);
await system.enrolStudent("S123456", "CS1010");
```

### Example 2: Prerequisites
```typescript
// Create a course that requires CS1010
const cs2020 = new Course("CS2020", "Data Structures", 20, 2);
cs2020.addPrerequisite("CS1010");

// Student without prerequisite is blocked
try {
  await system.enrolStudent("S123456", "CS2020");
} catch (e) {
  // PrerequisiteNotMetError thrown
}

// After completing CS1010
student.addCompletedCourse("CS1010");
await system.enrolStudent("S123456", "CS2020"); // Success
```

### Example 3: Timetable Clash Detection
```typescript
const course1 = new Course("CS1010", "Programming", 30);
course1.addTimeSlot(new TimeSlot("MON", 1000, 1200, 1));

const course2 = new Course("CS1020", "Web Dev", 30);
course2.addTimeSlot(new TimeSlot("MON", 1100, 1300, 1)); // Overlaps

await system.enrolStudent("S123456", "CS1010"); // OK
try {
  await system.enrolStudent("S123456", "CS1020"); // TimetableClashError
} catch (e) {
  // Error caught
}
```

### Example 4: Waitlist Management
```typescript
const course = new Course("CS1010", "Programming", 2); // Small capacity

// First two enrol directly
const enrol1 = await system.enrolStudent("S111111", "CS1010"); // true
const enrol2 = await system.enrolStudent("S222222", "CS1010"); // true

// Third goes on waitlist
const enrol3 = await system.enrolStudent("S333333", "CS1010"); // false

// When first drops, third is promoted
await system.dropStudent("S111111", "CS1010");
// S333333 is now enrolled (waitlist automatically updated)
```

## 🔒 Invariant Guarantees

1. **No Duplicate Enrolments**: A student cannot be enrolled in the same course twice
2. **Email Uniqueness**: Each student has unique email
3. **ID Uniqueness**: Each student/course has unique ID
4. **Timetable Consistency**: Student never has overlapping time slots
5. **Prerequisite Enforcement**: Never enrolled without prerequisites
6. **Capacity Respected**: Course never exceeds capacity
7. **Waitlist Integrity**: Waitlist automatically promotes on drop
8. **Atomic Operations**: All state changes are all-or-nothing

## 🛠️ Extension Points

The system is designed for easy extension:

### Add New Validation Rules
```typescript
// Extend Validators class
static validateCustom(value: string): void {
  // Custom validation logic
}
```

### Add New Error Types
```typescript
export class CustomError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
```

### Implement Different Repository
```typescript
export class DatabaseStudentRepository implements IStudentRepository {
  // Implement using your database
}
```

### Add New Enrolment Rules
```typescript
// In EnrolmentSystem.enrolStudent(), add validation checks
private checkCustomRule(student: Student, course: Course): void {
  // Custom validation
}
```

## 📝 Async Design Pattern

All operations are async-ready for I/O operations:

```typescript
// All methods return Promise
await system.registerStudent(student);
await system.createCourse(course);
const enrolled = await system.enrolStudent(studentId, courseId);
await system.dropStudent(studentId, courseId);
```

This enables:
- Database persistence
- Distributed transactions
- Background processing
- API integration

## 🎯 Design Principles Applied

1. **Domain-Driven Design**: Ubiquitous language with domain models
2. **Repository Pattern**: Separate persistence concerns
3. **Dependency Injection**: IUnitOfWork injected into EnrolmentSystem
4. **Strong Types**: No nulls or magic strings
5. **Fail-Fast Validation**: Errors thrown early with domain context
6. **Atomic Operations**: Transaction pattern ensures consistency
7. **Single Responsibility**: Each class has one reason to change
8. **Open/Closed**: Easy to extend without modifying existing code

## 📚 Useful References

- Time format: HHMM (0-2359)
- Semesters: 1 or 2
- Days: MON, TUE, WED, THU, FRI, SAT, SUN
- Academic standing: good, probation, suspended
- Student years: 1, 2, 3, 4
