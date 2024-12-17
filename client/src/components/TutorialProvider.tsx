import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';

// Define tutorial steps with integrated learning modules
export const tutorialSteps = {
  WELCOME: 'welcome',
  FINANCIAL_BASICS: 'financial_basics',
  DASHBOARD: 'dashboard',
  ACCOUNTING_101: 'accounting_101',
  CHART_OF_ACCOUNTS: 'chart_of_accounts',
  DATA_MANAGEMENT: 'data_management',
  DATA_UPLOAD: 'data_upload',
  ANALYSIS_INTRO: 'analysis_intro',
  DATA_ANALYSIS: 'data_analysis',
  REPORTING_BASICS: 'reporting_basics',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const;

type TutorialStep = typeof tutorialSteps[keyof typeof tutorialSteps];

interface TutorialContext {
  currentStep: TutorialStep | null;
  isActive: boolean;
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
}

const TutorialContext = createContext<TutorialContext | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);

  // Fetch tutorial progress
  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['/api/tutorial-progress'],
    enabled: !!user,
  });

  // Update tutorial progress
  const updateProgress = useMutation({
    mutationFn: async (step: TutorialStep) => {
      const response = await fetch('/api/tutorial-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update tutorial progress');
      }

      return response.json();
    },
    onSuccess: () => {
      refetchProgress();
    },
  });

  // Tutorial step content
  const stepContent: Record<TutorialStep, { 
    title: string; 
    description: string;
    hasModule?: boolean;
    moduleId?: number;
  }> = {
    welcome: {
      title: 'Welcome to Analee',
      description: 'Let\'s start your journey to financial excellence with some essential knowledge.',
      hasModule: true,
      moduleId: 1,
    },
    financial_basics: {
      title: 'Financial Literacy Fundamentals',
      description: 'Learn the basic concepts of financial management and accounting.',
      hasModule: true,
      moduleId: 2,
    },
    dashboard: {
      title: 'Dashboard',
      description: 'Your dashboard shows key financial metrics and insights at a glance.',
    },
    chart_of_accounts: {
      title: 'Chart of Accounts',
      description: 'Manage your financial accounts structure and hierarchy here.',
    },
    data_upload: {
      title: 'Data Upload',
      description: 'Upload your financial data from various sources like bank statements and Excel files.',
    },
    data_analysis: {
      title: 'Data Analysis',
      description: 'Analyze your financial data with advanced analytics and visualizations.',
    },
    reports: {
      title: 'Reports',
      description: 'Generate comprehensive financial reports including balance sheets and income statements.',
    },
    settings: {
      title: 'Settings',
      description: 'Configure your account settings and preferences.',
    },
  };

  // Start tutorial
  const startTutorial = () => {
    setCurrentStep(tutorialSteps.WELCOME);
    setIsActive(true);
  };

  // Skip tutorial
  const skipTutorial = async () => {
    try {
      if (currentStep) {
        await updateProgress.mutateAsync(currentStep);
      }
      setIsActive(false);
      setCurrentStep(null);
      toast({
        title: 'Tutorial skipped',
        description: 'You can restart the tutorial anytime from settings.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to skip tutorial:', error);
      toast({
        variant: "destructive",
        title: 'Error',
        description: 'Failed to skip tutorial. Please try again.',
        duration: 3000,
      });
    }
  };

  // Navigate to next step
  const nextStep = async () => {
    if (!currentStep) return;
    
    const steps = Object.values(tutorialSteps);
    const currentIndex = steps.indexOf(currentStep);
    
    try {
      await updateProgress.mutateAsync(currentStep);
      
      if (currentIndex === steps.length - 1) {
        // Tutorial completed
        setIsActive(false);
        setCurrentStep(null);
        toast({
          title: 'Tutorial completed!',
          description: 'You can now start using Analee to its full potential.',
          duration: 3000,
        });
      } else {
        // Move to next step
        setCurrentStep(steps[currentIndex + 1]);
      }
    } catch (error) {
      console.error('Failed to update tutorial progress:', error);
      toast({
        variant: "destructive",
        title: 'Error',
        description: 'Failed to move to next step. Please try again.',
        duration: 3000,
      });
    }
  };

  // Navigate to previous step
  const previousStep = () => {
    const steps = Object.values(tutorialSteps);
    const currentIndex = steps.indexOf(currentStep!);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Auto-start tutorial for new users
  useEffect(() => {
    if (user && !progress?.isCompleted && !isActive) {
      startTutorial();
    }
  }, [user, progress]);

  return (
    <TutorialContext.Provider 
      value={{ 
        currentStep, 
        isActive, 
        startTutorial, 
        skipTutorial, 
        nextStep, 
        previousStep 
      }}
    >
      {children}
      
      {/* Tutorial Dialog */}
      <Dialog 
        open={isActive} 
        onOpenChange={(open) => {
          if (!open) {
            skipTutorial();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {currentStep && stepContent[currentStep].title}
            </DialogTitle>
            <DialogDescription className="text-base">
              {currentStep && stepContent[currentStep].description}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => previousStep()}
                disabled={!currentStep || currentStep === tutorialSteps.WELCOME}
                className="flex-1 sm:flex-none"
              >
                Previous
              </Button>
              <Button 
                onClick={() => nextStep()}
                className="flex-1 sm:flex-none"
              >
                {currentStep === Object.values(tutorialSteps).slice(-1)[0] ? 'Finish' : 'Next'}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => skipTutorial()}
              className="w-full sm:w-auto"
            >
              Skip Tutorial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TutorialContext.Provider>
  );
}
