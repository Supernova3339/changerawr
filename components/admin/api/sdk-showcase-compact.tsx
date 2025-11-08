import React, { useState } from 'react';
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Code, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SDKShowcaseCompact = ({ className }: { className?: string }) => {
    const [copied, setCopied] = useState({
        react: false,
        php: false
    });

    const handleCopy = (text: string, sdk: string) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [sdk]: true });

        toast({
            title: 'Command Copied',
            description: 'The installation command has been copied to your clipboard.',
        });

        setTimeout(() => {
            setCopied({ ...copied, [sdk]: false });
        }, 2000);
    };

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    SDKs & Tools
                </CardTitle>
                <CardDescription className="text-xs">
                    Official client libraries
                </CardDescription>
            </CardHeader>

            <Tabs defaultValue="react" className="w-full">
                <TabsList className="mx-6 grid grid-cols-2 mb-1">
                    <TabsTrigger value="react" className="text-xs">React</TabsTrigger>
                    <TabsTrigger value="php" className="text-xs">PHP</TabsTrigger>
                </TabsList>

                <TabsContent value="react" className="mt-0">
                    <CardContent className="p-4 pt-4 space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs font-medium">Installation</p>
                            <div className="rounded-md overflow-hidden border">
                                <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b">
                                    <span className="text-xs text-muted-foreground">npm</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        onClick={() => handleCopy("npm install @changerawr/react", "react")}
                                    >
                                        {copied.react ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                                <div className="p-2 font-mono text-xs">
                                    <code>npm install @changerawr/react</code>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-xs font-medium">Features</p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                                <li className="flex items-start gap-1.5">
                                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>TypeScript support</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>React hooks</span>
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </TabsContent>

                <TabsContent value="php" className="mt-0">
                    <CardContent className="p-4 pt-4 space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs font-medium">Installation</p>
                            <div className="rounded-md overflow-hidden border">
                                <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b">
                                    <span className="text-xs text-muted-foreground">composer</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        onClick={() => handleCopy("composer require changerawr/php", "php")}
                                    >
                                        {copied.php ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                                <div className="p-2 font-mono text-xs">
                                    <code>composer require changerawr/php</code>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-xs font-medium">Features</p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                                <li className="flex items-start gap-1.5">
                                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>Lightweight client</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>PHP 7.4+ compatible</span>
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>
    );
}

export default SDKShowcaseCompact;