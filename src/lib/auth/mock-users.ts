import { AppUser } from "@/lib/types";

export const mockUsers: AppUser[] = [
  {
    id: "agent-1",
    email: "sarah@agency.com",
    password: "password123",
    name: "Sarah Cohen",
    role: "agent"
  },
  {
    id: "agent-2",
    email: "david@agency.com",
    password: "password123",
    name: "David Levi",
    role: "agent"
  },
  {
    id: "admin-1",
    email: "admin@agency.com",
    password: "admin123",
    name: "Portal Admin",
    role: "admin"
  }
];

export function findUserByCredentials(email: string, password: string) {
  return mockUsers.find((user) => user.email === email.toLowerCase() && user.password === password);
}
