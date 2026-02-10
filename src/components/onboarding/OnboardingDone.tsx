import { useNavigate } from 'react-router-dom';

interface OnboardingDoneProps {
  projectCount: number;
  hasFirstFire: boolean;
}

export function OnboardingDone({ projectCount, hasFirstFire }: OnboardingDoneProps) {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">You're all set!</h2>
        <p className="text-text-secondary">
          Your command center is ready to go.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="flex justify-center gap-8 py-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-600">{projectCount}</div>
          <div className="text-sm text-text-secondary">
            {projectCount === 1 ? 'Project' : 'Projects'} added
          </div>
        </div>
        {hasFirstFire && (
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">1</div>
            <div className="text-sm text-text-secondary">Priority task</div>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={() => navigate('/war-room')}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-md transition-colors text-lg"
        >
          Go to War Room
        </button>
      </div>

      <p className="text-xs text-text-secondary pt-4">
        Tip: Use the + button to quickly add quotes, status updates, and more.
      </p>
    </div>
  );
}
