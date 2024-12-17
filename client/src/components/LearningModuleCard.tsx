import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, BookOpen } from "lucide-react";

interface LearningModuleProps {
  title: string;
  description: string;
  category: string;
  progress: number;
  isCompleted: boolean;
  onStart: () => void;
  onContinue: () => void;
}

export function LearningModuleCard({
  title,
  description,
  category,
  progress,
  isCompleted,
  onStart,
  onContinue,
}: LearningModuleProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {isCompleted && (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Category: {category}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <div className="text-sm text-muted-foreground">
            {progress}% complete
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={progress > 0 ? onContinue : onStart}
          variant={isCompleted ? "outline" : "default"}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          {isCompleted 
            ? "Review Module" 
            : progress > 0 
              ? "Continue Learning" 
              : "Start Module"}
        </Button>
      </CardFooter>
    </Card>
  );
}
