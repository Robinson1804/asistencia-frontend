
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SkillMatrixProps {
  title: string;
  description: string;
  skillGroupName: 'frontend' | 'backend' | 'databases' | 'devops';
  skillsBySubgroup: Record<string, string[]>;
}

const skillLevels: ('DESCONOCE' | 'BÁSICO' | 'INTERMEDIO' | 'AVANZADO')[] = ['DESCONOCE', 'BÁSICO', 'INTERMEDIO', 'AVANZADO'];

export function SkillMatrix({ title, description, skillGroupName, skillsBySubgroup }: SkillMatrixProps) {
  const { control } = useFormContext();

  return (
    <Card className="bg-background/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px]">Tecnología</TableHead>
                        {skillLevels.map(level => (
                            <TableHead key={level} className="text-center">{level}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(skillsBySubgroup).map(([subgroup, skills]) => (
                        <>
                            <TableRow key={subgroup} className="bg-muted/50">
                                <TableCell colSpan={5} className="font-bold text-primary">{subgroup}</TableCell>
                            </TableRow>
                            {skills.map(skill => (
                                <TableRow key={skill}>
                                    <TableCell className="font-medium">{skill}</TableCell>
                                    {skillLevels.map(level => (
                                        <TableCell key={level} className="text-center">
                                            <Controller
                                                name={`${skillGroupName}.${skill}`}
                                                control={control}
                                                render={({ field }) => (
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        className="flex justify-center"
                                                    >
                                                        <RadioGroupItem value={level} id={`${skillGroupName}-${skill}-${level}`} />
                                                    </RadioGroup>
                                                )}
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </>
                    ))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
