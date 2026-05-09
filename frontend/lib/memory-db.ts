import fs from 'fs';
import path from 'path';

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  relationshipScore: number;
  lastInteraction: string;
  interactionCount: number;
  importanceScore: number;
  notes: string[];
  chatHistory?: { role: string; content: string; timestamp: string }[];
}

export interface Conversation {
  threadId: string;
  subject: string;
  summary: string;
  sentiment: string;
  lastUpdated: string;
}

export interface AutonomousAction {
  id: string;
  action: string;
  status: string;
  timestamp: string;
  agent: string;
  details: string;
}

export interface MemorySchema {
  contacts: Contact[];
  conversations: Conversation[];
  actions: AutonomousAction[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'memory.json');

// Ensure database exists
function ensureDb() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const defaultData: MemorySchema = { contacts: [], conversations: [], actions: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
  }
}

export function readMemory(): MemorySchema {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function writeMemory(data: MemorySchema) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export class MemoryAgent {
  static getContact(email: string): Contact | undefined {
    const db = readMemory();
    return db.contacts.find(c => c.email.toLowerCase() === email.toLowerCase());
  }

  static upsertContact(email: string, partial: Partial<Contact>): Contact {
    const db = readMemory();
    const index = db.contacts.findIndex(c => c.email.toLowerCase() === email.toLowerCase());
    
    if (index >= 0) {
      db.contacts[index] = { ...db.contacts[index], ...partial, interactionCount: db.contacts[index].interactionCount + 1, lastInteraction: new Date().toISOString() };
      writeMemory(db);
      return db.contacts[index];
    } else {
      const newContact: Contact = {
        id: crypto.randomUUID(),
        email,
        name: partial.name || email.split('@')[0],
        company: partial.company || '',
        relationshipScore: partial.relationshipScore || 10,
        importanceScore: partial.importanceScore || 10,
        interactionCount: 1,
        lastInteraction: new Date().toISOString(),
        notes: partial.notes || [],
      };
      db.contacts.push(newContact);
      writeMemory(db);
      return newContact;
    }
  }

  static getTopContacts(limit: number = 5): Contact[] {
    const db = readMemory();
    return db.contacts.sort((a, b) => b.relationshipScore - a.relationshipScore).slice(0, limit);
  }

  static logAction(action: Omit<AutonomousAction, 'id' | 'timestamp'>) {
    const db = readMemory();
    db.actions.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...action
    });
    writeMemory(db);
  }
  
  static getRecentActions(limit: number = 10): AutonomousAction[] {
    const db = readMemory();
    return db.actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  static addChatHistory(email: string, role: string, content: string) {
    const db = readMemory();
    const index = db.contacts.findIndex(c => c.email.toLowerCase() === email.toLowerCase());
    
    if (index >= 0) {
      if (!db.contacts[index].chatHistory) {
        db.contacts[index].chatHistory = [];
      }
      db.contacts[index].chatHistory.push({
        role,
        content,
        timestamp: new Date().toISOString()
      });
      // Keep only last 20 messages to prevent bloated memory
      if (db.contacts[index].chatHistory.length > 20) {
        db.contacts[index].chatHistory.shift();
      }
      writeMemory(db);
    }
  }
}
