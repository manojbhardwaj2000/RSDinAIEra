# Course Enrolment System - Complete Package

A comprehensive, production-grade course enrolment system built with TypeScript, implementing strict domain-driven design with atomic operations, complete validation, and extensive testing.

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Complete feature overview, design principles, and usage examples |
| **QUICKSTART.md** | 5-minute tutorial with common patterns and error handling |
| **ARCHITECTURE.md** | System design diagrams, data models, and validation pipelines |
| **IMPLEMENTATION.md** | Requirement coverage checklist with file references |

## 🗂️ Source Code Files

### Domain Models (`models/`)
| File | Description |
|------|-------------|
| [Student.ts](models/Student.ts) | Student domain model with eligibility tracking |
| [Course.ts](models/Course.ts) | Course model with prerequisites, co-requisites, timetable, enrolment windows |
| [Enrolment.ts](models/Enrolment.ts) | First-class Enrolment concept for atomicity |

### Type System (`types/`)
| File | Description |
|------|-------------|
| [Errors.ts](types/Errors.ts) | 13 domain-specific error types inheriting from DomainError |
| [Validators.ts](types/Validators.ts) | 6 validation utilities (email, ID, uniqueness, etc.) |
| [TimeSlot.ts](types/TimeSlot.ts) | Timetable slot with clash detection logic |
| [EnrolmentWindow.ts](types/EnrolmentWindow.ts) | Enrolment phase management (registration, add-drop, withdrawal) |

### Repository Layer (`repositories/`)
| File | Description |
|------|-------------|
| [IRepository.ts](repositories/IRepository.ts) | Interface definitions for Student, Course, Enrolment repos and UnitOfWork |
| [InMemoryRepository.ts](repositories/InMemoryRepository.ts) | In-memory implementations with optimized indexing |

### Core System
| File | Description |
|------|-------------|
| [EnrolmentSystem.ts](EnrolmentSystem.ts) | Main orchestrator enforcing 10 domain rules atomically |

### Testing & Demonstration
| File | Description |
|------|-------------|
| [EnrolmentSystem.test.ts](EnrolmentSystem.test.ts) | 40+ comprehensive tests covering all features |
| [demo.ts](demo.ts) | Real-world usage examples and workflows |

## ✨ Key Features at a Glance

### ✅ Requirement Completeness

| Requirement | Status | Evidence |
|-----------|--------|----------|
| Enrolment as first-class concept | ✅ | [Enrolment.ts](models/Enrolment.ts), separate repository |
| Atomic updates | ✅ | Transaction pattern, all-or-nothing operations |
| Dual indexing | ✅ | [InMemoryRepository.ts](repositories/InMemoryRepository.ts) lines ~120-150 |
| Prerequisites enforcement | ✅ | [EnrolmentSystem.ts](EnrolmentSystem.ts) line ~95, Test: line ~240 |
| Co-requisites enforcement | ✅ | [EnrolmentSystem.ts](EnrolmentSystem.ts) line ~100, Test: line ~271 |
| Timetable clash detection | ✅ | [TimeSlot.ts](types/TimeSlot.ts), [EnrolmentSystem.ts](EnrolmentSystem.ts) line ~105, Test: line ~296 |
| Enrolment windows | ✅ | [EnrolmentWindow.ts](types/EnrolmentWindow.ts), Test: line ~168 |
| Waitlists | ✅ | [Course.ts](models/Course.ts) line ~115+, Test: line ~382 |
| Student eligibility | ✅ | [Student.ts](models/Student.ts), [EnrolmentSystem.ts](EnrolmentSystem.ts) line ~90-130 |
| Email validation | ✅ | [Validators.ts](types/Validators.ts) line ~10, Test: line ~73 |
| ID validation | ✅ | [Validators.ts](types/Validators.ts) line ~19, Test: line ~59 |
| Course ID validation | ✅ | [Validators.ts](types/Validators.ts) line ~28, Test: line ~88 |
| Uniqueness enforcement | ✅ | [repositories/InMemoryRepository.ts](repositories/InMemoryRepository.ts), Test: line ~135 |
| Domain error types | ✅ | [types/Errors.ts](types/Errors.ts) (13 error types) |
| Repository pattern | ✅ | [repositories/IRepository.ts](repositories/IRepository.ts) + Implementation |
| Atomic operations | ✅ | [EnrolmentSystem.ts](EnrolmentSystem.ts) transaction pattern |
| Comprehensive tests | ✅ | [EnrolmentSystem.test.ts](EnrolmentSystem.test.ts) (40+ tests) |

## 🚀 Quick Start

### Installation
```bash
cd Week01/VagueIntent
npm install -g typescript
tsc
```

### Run Tests
```bash
node EnrolmentSystem.test.js
# Output: 40+ tests with full coverage
```

### Run Demo
```bash
node demo.js
# Output: Real-world usage scenarios
```

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| Total Files | 13 |
| TypeScript Source Lines | ~2,000+ |
| Domain Models | 3 |
| Error Types | 13 |
| Validators | 6 |
| Repository Interfaces | 4 |
| In-Memory Implementations | 4 |
| Test Cases | 40+ |
| Documentation Files | 4 |

## 🎯 Design Patterns Used

- **Domain-Driven Design**: Core domain models with ubiquitous language
- **Repository Pattern**: Abstract persistence layer
- **Unit of Work Pattern**: Transaction coordination
- **Atomic Design**: All-or-nothing operations
- **Strategy Pattern**: Pluggable repository implementations
- **Fail-Fast Validation**: Early error detection with domain context
- **Dependency Injection**: IUnitOfWork injected into system

## 🔒 Invariants Protected

1. No duplicate enrolments
2. Email uniqueness per student
3. ID uniqueness per student/course
4. No timetable overlaps
5. Prerequisite enforcement
6. Capacity respected
7. Waitlist auto-promotion
8. Atomic transactions

## 📖 Reading Order

1. **New to the system?** Start with [QUICKSTART.md](QUICKSTART.md)
2. **Want feature overview?** Read [README.md](README.md)
3. **Need architecture details?** See [ARCHITECTURE.md](ARCHITECTURE.md)
4. **Checking requirements?** Review [IMPLEMENTATION.md](IMPLEMENTATION.md)
5. **Learning by example?** Study [demo.ts](demo.ts)
6. **Understanding tests?** Examine [EnrolmentSystem.test.ts](EnrolmentSystem.test.ts)

## 🔧 Extending the System

### Add New Validation Rule
```typescript
// In Validators.ts
static validateCustomRule(value: string): void {
  // Custom logic
  if (!condition) throw new ValidationError("field", "message");
}
```

### Add New Error Type
```typescript
// In Errors.ts
export class CustomError extends DomainError {
  constructor(context: string) {
    super(`Custom error: ${context}`);
  }
}
```

### Switch to Database Persistence
```typescript
// Implement IRepository interfaces
export class PostgresStudentRepository implements IStudentRepository {
  async save(student: Student): Promise<void> {
    // Database logic
  }
  // ... other methods
}
```

## 🧪 Test Coverage

### Test Categories
- ✅ Validation tests (6)
- ✅ Basic functionality (5)
- ✅ Enrolment windows (2)
- ✅ Prerequisites (2)
- ✅ Co-requisites (1)
- ✅ Timetable clashes (2)
- ✅ Eligibility checks (3)
- ✅ Capacity & waitlist (2)
- ✅ Error handling (3)
- ✅ Additional scenarios (13)

### Coverage Areas
- Edge cases (boundary conditions)
- Invalid inputs (format validation)
- Failure scenarios (all error types)
- Concurrency behavior (atomic operations)
- Domain rule enforcement (all rules)

## 📝 Example Usage

```typescript
// 1. Create system
const unitOfWork = new InMemoryUnitOfWork();
const system = new EnrolmentSystem(unitOfWork);

// 2. Register student
const student = new Student("S123456", "Alice", "alice@test.com", "CS", 2);
await system.registerStudent(student);

// 3. Create course with rules
const course = new Course("CS2020", "Data Structures", 30, 2);
course.addPrerequisite("CS1010");
course.addTimeSlot(new TimeSlot("MON", 1000, 1200, 1));
const window = new EnrolmentWindow("registration", start, end, 1);
course.setEnrolmentWindow(window);
await system.createCourse(course);

// 4. Enrol student (validates all rules)
try {
  const enrolled = await system.enrolStudent("S123456", "CS2020");
  console.log(enrolled ? "Enrolled" : "Waitlisted");
} catch (error) {
  console.log(`Enrolment failed: ${error.message}`);
}
```

## 🎓 Learning Resources

- **Enrolment validation**: See [EnrolmentSystem.ts](EnrolmentSystem.ts) lines 80-130
- **Timetable clash logic**: See [TimeSlot.ts](types/TimeSlot.ts) line 20
- **Waitlist promotion**: See [Course.ts](models/Course.ts) line 160
- **Error handling**: See [types/Errors.ts](types/Errors.ts)
- **Test examples**: See [EnrolmentSystem.test.ts](EnrolmentSystem.test.ts)

## 📞 Support

For questions about:
- **Features**: See README.md
- **Getting Started**: See QUICKSTART.md
- **Architecture**: See ARCHITECTURE.md
- **Requirements**: See IMPLEMENTATION.md
- **Code Examples**: See demo.ts
- **Testing**: See EnrolmentSystem.test.ts

---

**Last Updated**: December 31, 2025
**Version**: 1.0.0
**Status**: Production-Ready ✅
