/**
 * Represents a student in the system
 */
export class Student {
  private id: string;
  private name: string;
  private email: string;

  constructor(id: string, name: string, email: string) {
    if (!id || !name || !email) {
      throw new Error("Student must have id, name, and email");
    }
    this.id = id;
    this.name = name;
    this.email = email;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  toString(): string {
    return `Student(${this.id}, ${this.name}, ${this.email})`;
  }
}
