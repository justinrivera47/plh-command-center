import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { MessageTemplate } from '../lib/types';

export function useMessageTemplates() {
  return useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });
}

export function useMessageTemplatesByCategory() {
  const { data: templates, ...rest } = useMessageTemplates();

  const groupedByCategory = templates?.reduce((acc, template) => {
    const category = template.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  return {
    data: groupedByCategory,
    templates,
    ...rest,
  };
}

// Template variable interpolation
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || `{{${key}}}`;
  });
}

// Common variables for templates
export interface TemplateVariables {
  contact_name?: string;
  project_name?: string;
  project_address?: string;
  task_name?: string;
  vendor_name?: string;
  trade_name?: string;
  user_name?: string;
  deadline?: string;
  days_waiting?: string;
}
