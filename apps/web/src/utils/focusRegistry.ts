/**
 * Focus Registry
 * 
 * Shared utility for registering and focusing fields across panes
 * Allows Publish Readiness panel to navigate to exact field locations
 */

export type EntityType = 'course' | 'section' | 'lesson';
export type FieldKey = string;

export interface FocusableField {
  entityType: EntityType;
  entityId: string;
  fieldKey: FieldKey;
  ref: React.RefObject<HTMLElement>;
  onFocus?: () => void; // Callback to open drawer/panel before focusing
}

class FocusRegistry {
  private fields: Map<string, FocusableField> = new Map();

  /**
   * Register a focusable field
   */
  register(field: FocusableField): () => void {
    const key = this.getKey(field.entityType, field.entityId, field.fieldKey);
    this.fields.set(key, field);
    
    // Return unregister function
    return () => {
      this.fields.delete(key);
    };
  }

  /**
   * Focus a field by entity type, ID, and field key
   */
  focus(entityType: EntityType, entityId: string, fieldKey: FieldKey): boolean {
    const key = this.getKey(entityType, entityId, fieldKey);
    const field = this.fields.get(key);
    
    if (field) {
      // Call onFocus callback first (e.g., to open drawer)
      if (field.onFocus) {
        field.onFocus();
      }
      
      // Small delay to allow UI to update (drawer opening, etc.)
      setTimeout(() => {
        if (field.ref.current) {
          // Scroll into view first
          field.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Focus the element
          if (field.ref.current instanceof HTMLInputElement || 
              field.ref.current instanceof HTMLTextAreaElement) {
            field.ref.current.focus();
            return;
          }
          
          // If it's a container, try to find an input/textarea inside
          const input = field.ref.current.querySelector('input, textarea') as HTMLElement;
          if (input) {
            input.focus();
            return;
          }
          
          // For rich text editors, focus the container and add highlight
          if (field.ref.current.querySelector('[contenteditable="true"]')) {
            field.ref.current.style.outline = '2px solid';
            field.ref.current.style.outlineColor = 'rgb(25, 118, 210)';
            field.ref.current.style.outlineOffset = '2px';
            setTimeout(() => {
              field.ref.current!.style.outline = '';
            }, 2000);
            field.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
      
      return true;
    }
    
    return false;
  }

  /**
   * Get all fields for a specific entity
   */
  getFieldsForEntity(entityType: EntityType, entityId: string): FocusableField[] {
    const prefix = `${entityType}:${entityId}:`;
    const result: FocusableField[] = [];
    
    for (const [key, field] of this.fields.entries()) {
      if (key.startsWith(prefix)) {
        result.push(field);
      }
    }
    
    return result;
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.fields.clear();
  }

  private getKey(entityType: EntityType, entityId: string, fieldKey: FieldKey): string {
    return `${entityType}:${entityId}:${fieldKey}`;
  }
}

// Singleton instance
export const focusRegistry = new FocusRegistry();

