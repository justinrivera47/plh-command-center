import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useUIStore } from '../../stores/uiStore';
import { useMessageTemplatesByCategory, interpolateTemplate } from '../../hooks/useMessageTemplates';
import { useRFI } from '../../hooks/useRFIs';
import { useProject } from '../../hooks/useProjects';
import type { MessageTemplate } from '../../lib/types';

export function MessageComposer() {
  const { messageComposerOpen, messageComposerContext, closeMessageComposer } = useUIStore();
  const { data: groupedTemplates, isLoading } = useMessageTemplatesByCategory();

  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch RFI and project context if available
  const { data: rfi } = useRFI(messageComposerContext?.rfiId);
  const { data: project } = useProject(rfi?.project_id);

  // Reset state and auto-select template when modal opens
  useEffect(() => {
    if (messageComposerOpen) {
      setSubject('');
      setBody('');
      setCopied(false);

      // Auto-select template based on context if available
      if (messageComposerContext?.templateCategory && groupedTemplates) {
        const categoryTemplates = groupedTemplates[messageComposerContext.templateCategory];
        if (categoryTemplates && categoryTemplates.length > 0) {
          // Select the first template in the matching category
          setSelectedTemplate(categoryTemplates[0]);
          return;
        }
      }
      setSelectedTemplate(null);
    }
  }, [messageComposerOpen, messageComposerContext?.templateCategory, groupedTemplates]);

  // Interpolate template when selected
  useEffect(() => {
    if (selectedTemplate) {
      const variables = {
        contact_name: messageComposerContext?.pocName || '[Contact Name]',
        project_name: project?.name || '[Project Name]',
        project_address: project?.address || '[Project Address]',
        task_name: rfi?.task || '[Task]',
        user_name: '[Your Name]',
      };

      if (selectedTemplate.subject_template) {
        setSubject(interpolateTemplate(selectedTemplate.subject_template, variables));
      }
      setBody(interpolateTemplate(selectedTemplate.body_template, variables));
    }
  }, [selectedTemplate, messageComposerContext, project, rfi]);

  const handleCopy = async () => {
    const fullMessage = subject ? `Subject: ${subject}\n\n${body}` : body;
    await navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  return (
    <Dialog.Root open={messageComposerOpen} onOpenChange={(open) => !open && closeMessageComposer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed z-50 bg-white rounded-t-2xl md:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto bottom-0 left-0 right-0 md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full">
          {/* Handle for mobile */}
          <div className="md:hidden flex justify-center py-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                {selectedTemplate ? 'Draft Message' : 'Message Templates'}
              </Dialog.Title>
              <Dialog.Close className="p-1 hover:bg-gray-100 rounded text-text-secondary">
                ✕
              </Dialog.Close>
            </div>

            {/* Context info */}
            {(rfi || messageComposerContext?.pocName) && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                {rfi && (
                  <p className="text-text-primary font-medium">{rfi.task}</p>
                )}
                {project && (
                  <p className="text-text-secondary">{project.name}</p>
                )}
                {messageComposerContext?.pocName && (
                  <p className="text-text-secondary">To: {messageComposerContext.pocName}</p>
                )}
              </div>
            )}

            {/* Template selection */}
            {!selectedTemplate && (
              <div className="space-y-4">
                {isLoading && (
                  <div className="text-center py-8 text-text-secondary">
                    Loading templates...
                  </div>
                )}

                {groupedTemplates && Object.entries(groupedTemplates).map(([category, templates]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-text-secondary mb-2 uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className="w-full text-left p-3 rounded-lg border border-border hover:border-primary-300 hover:bg-primary-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {template.channel === 'email' ? '✉️' :
                               template.channel === 'phone' ? '📞' : '💬'}
                            </span>
                            <span className="font-medium text-text-primary">{template.name}</span>
                          </div>
                          {template.notes && (
                            <p className="text-xs text-text-secondary mt-1 ml-7">
                              {template.notes}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {!isLoading && (!groupedTemplates || Object.keys(groupedTemplates).length === 0) && (
                  <div className="text-center py-8 text-text-secondary">
                    <div className="text-4xl mb-2">📝</div>
                    <p>No templates available</p>
                    <p className="text-sm mt-1">Templates are loaded from the database</p>
                  </div>
                )}
              </div>
            )}

            {/* Message editor */}
            {selectedTemplate && (
              <div className="space-y-4">
                {/* Back button */}
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  ← Choose different template
                </button>

                {/* Subject (for email) */}
                {selectedTemplate.channel === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                {/* Placeholder hints */}
                <p className="text-xs text-text-secondary">
                  Tip: Replace any [bracketed text] with actual values before sending.
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2 px-4 bg-gray-100 text-text-primary font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                  </button>
                  {selectedTemplate.channel === 'email' && (
                    <button
                      onClick={handleEmail}
                      className="flex-1 py-2 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      ✉️ Open in Email
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
