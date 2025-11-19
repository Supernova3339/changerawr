'use client'

import React, {JSX, useState} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {toast} from '@/hooks/use-toast';
import {
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    Loader2,
    KeyRound,
    Fingerprint,
    Copy,
    Settings,
    ExternalLink,
    Globe,
    Link2
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {z} from 'zod';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useAuth} from '@/context/auth';
import {Badge} from '@/components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Separator} from '@/components/ui/separator';
import 'dotenv/config';

// Enhanced form schema with custom URL options
const providerFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    urlMode: z.enum(['preset', 'custom']).default('preset'),
    preset: z.string().optional(),
    baseUrl: z.string().optional(),
    authorizationUrl: z.string().optional(),
    tokenUrl: z.string().optional(),
    userInfoUrl: z.string().optional(),
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required'),
    scopes: z.string().refine(value => {
        const scopes = value.split(',').map(s => s.trim()).filter(Boolean);
        return scopes.length > 0;
    }, {
        message: 'At least one scope is required'
    }),
    enabled: z.boolean().default(true),
    isDefault: z.boolean().default(false)
}).refine((data) => {
    if (data.urlMode === 'preset' && !data.preset) {
        return false;
    }
    if (data.urlMode === 'custom') {
        return data.authorizationUrl && data.tokenUrl && data.userInfoUrl;
    }
    return true;
}, {
    message: 'Please select a preset or provide all custom URLs',
    path: ['urlMode']
});

type ProviderFormValues = z.infer<typeof providerFormSchema>;

// Provider presets with accurate configurations
const PROVIDER_PRESETS = {
    microsoft: {
        name: 'Microsoft',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        defaultScopes: 'openid,profile,email,User.Read'
    },
    google: {
        name: 'Google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        defaultScopes: 'openid,profile,email'
    },
    github: {
        name: 'GitHub',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        defaultScopes: 'user:email,read:user'
    },
    auth0: {
        name: 'Auth0',
        authorizationUrl: 'https://your-domain.auth0.com/authorize',
        tokenUrl: 'https://your-domain.auth0.com/oauth/token',
        userInfoUrl: 'https://your-domain.auth0.com/userinfo',
        defaultScopes: 'openid,profile,email'
    },
    okta: {
        name: 'Okta',
        authorizationUrl: 'https://your-domain.okta.com/oauth2/default/v1/authorize',
        tokenUrl: 'https://your-domain.okta.com/oauth2/default/v1/token',
        userInfoUrl: 'https://your-domain.okta.com/oauth2/default/v1/userinfo',
        defaultScopes: 'openid,profile,email'
    },
    easypanel: {
        name: 'Easypanel',
        authorizationUrl: 'https://your-easypanel-instance.com/oauth/authorize',
        tokenUrl: 'https://your-easypanel-instance.com/oauth/token',
        userInfoUrl: 'https://your-easypanel-instance.com/oauth/userinfo',
        defaultScopes: 'openid,profile,email'
    },
    custom: {
        name: 'Custom Provider',
        authorizationUrl: '',
        tokenUrl: '',
        userInfoUrl: '',
        defaultScopes: 'openid,profile,email'
    }
};

// Add type for providers
interface OAuthProvider {
    id: string;
    name: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    enabled: boolean;
    isDefault: boolean;
}

// Type for the API request body
interface ProviderApiData {
    name: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    enabled: boolean;
    isDefault: boolean;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
}

// Provider logo component that handles placeholders
const ProviderLogo: React.FC<{ providerName: string }> = ({providerName}) => {
    // Map known providers to predefined SVG placeholders
    const knownProviders: Record<string, JSX.Element> = {
        'easypanel': (
            <div className="w-10 h-10 rounded-md bg-transparent flex items-center justify-center text-primary">
                <svg height="310" width="310" fill="none" viewBox="0 0 310 310" xmlns="http://www.w3.org/2000/svg">
                    <rect height="310" width="310" fill="url(#paint0_linear_3064_30643)" rx="79.2222"/>
                    <g filter="url(#filter0_di_3064_30643)">
                        <path
                            d="M171.445 131.475C168.064 127.549 163.14 125.291 157.958 125.291H96.9979L113.357 85.8796C116.115 79.2351 122.602 74.9043 129.796 74.9043L181.204 74.9043C186.354 74.9044 191.251 77.1347 194.632 81.0194L229.195 120.74C233.646 125.855 234.804 133.053 232.183 139.306L214.503 181.477L171.445 131.475ZM138.438 178.501C141.82 182.442 146.753 184.709 151.946 184.709H213.172L196.557 224.2C193.779 230.802 187.314 235.096 180.151 235.096H128.681C123.531 235.096 118.634 232.865 115.253 228.981L80.7119 189.285C76.2499 184.158 75.098 176.936 77.7432 170.675L95.5501 128.523L138.438 178.501Z"
                            fill="url(#paint1_linear_3064_30643)" fillRule="evenodd"/>
                    </g>
                    <defs>
                        <filter height="192.191" id="filter0_di_3064_30643" width="189.228" x="62.3398" y="62.9043"
                                filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood result="BackgroundImageFix" floodOpacity="0"/>
                            <feGaussianBlur stdDeviation="8"/>
                            <feGaussianBlur stdDeviation="2"/>
                            <feBlend result="effect1_dropShadow_3064_30643" in2="BackgroundImageFix"/>
                            <feBlend result="shape" in="SourceGraphic" in2="effect1_dropShadow_3064_30643"/>
                            <feBlend result="effect2_innerShadow_3064_30643" in2="shape"/>
                        </filter>
                        <linearGradient id="paint0_linear_3064_30643" gradientUnits="userSpaceOnUse" x1="92.3325"
                                        x2="312.451" y1="-71.1962" y2="484.052">
                            <stop stopColor="#0BA864"/>
                            <stop offset="1" stopColor="#19BFBF"/>
                        </linearGradient>
                        <linearGradient id="paint1_linear_3064_30643" gradientUnits="userSpaceOnUse" x1="154.954"
                                        x2="154.954" y1="74.9043" y2="235.096">
                            <stop stopColor="white"/>
                            <stop offset="1" stopColor="#D4E8D5"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        ),
        'github': (
            <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"
                     strokeLinecap="round" strokeLinejoin="round">
                    <path
                        d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
            </div>
        ),
        'google': (
            <div className="w-10 h-10 rounded-md bg-white border flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
                    <path fill="#fbc02d"
                          d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    <path fill="#e53935"
                          d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                    <path fill="#4caf50"
                          d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                    <path fill="#1565c0"
                          d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
            </div>
        ),
        'microsoft': (
            <div className="w-10 h-10 rounded-md bg-white border flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
                    <path fill="#ff5722" d="M6 6H22V22H6z" transform="rotate(-180 14 14)"></path>
                    <path fill="#4caf50" d="M26 6H42V22H26z" transform="rotate(-180 34 14)"></path>
                    <path fill="#ffc107" d="M26 26H42V42H26z" transform="rotate(-180 34 34)"></path>
                    <path fill="#03a9f4" d="M6 26H22V42H6z" transform="rotate(-180 14 34)"></path>
                </svg>
            </div>
        ),
        'auth0': (
            <div className="w-10 h-10 rounded-md bg-orange-50 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-orange-500"></div>
            </div>
        ),
        'okta': (
            <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"
                     strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                </svg>
            </div>
        ),
        'pocketid': (
            <div
                className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
                <svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                    <g transform="scale(0.125)">
                        <path
                            d="M0 0 C1.22240387 -0.00852997 2.44480774 -0.01705994 3.70425415 -0.02584839 C5.0560304 -0.02514938 6.40780655 -0.02422633 7.75958252 -0.02310181 C9.18560132 -0.02908737 10.61161687 -0.03589298 12.03762817 -0.04345703 C15.90972313 -0.06112467 19.78172968 -0.06581282 23.65386105 -0.0670886 C26.07480474 -0.06851069 28.495726 -0.07278145 30.91666412 -0.07808304 C39.36789882 -0.09658807 47.81907043 -0.10475334 56.27032471 -0.10317993 C64.13881545 -0.10197942 72.0070315 -0.12306266 79.87545276 -0.15466726 C86.63739901 -0.1808562 93.39925571 -0.19154608 100.16125226 -0.19026911 C104.19690178 -0.18976011 108.23230733 -0.19540854 112.26790619 -0.21662521 C116.06668745 -0.23605112 119.8649932 -0.23610277 123.66379166 -0.22159195 C125.05369133 -0.21950789 126.4436211 -0.22418075 127.83346939 -0.23631287 C139.69821631 -0.33312596 146.28346497 2.07529934 155.04962158 10.17758179 C157.75025927 13.02736712 159.33021801 15.7316911 161.03009033 19.26742554 C161.38680124 19.8713274 161.74351215 20.47522926 162.11103249 21.09743118 C163.3042125 23.91465743 163.28786842 26.17883227 163.29751587 29.23733521 C163.31031082 31.07094101 163.31031082 31.07094101 163.32336426 32.94158936 C163.32266525 34.29336561 163.3217422 35.64514176 163.32061768 36.99691772 C163.32660323 38.42293652 163.33340885 39.84895208 163.3409729 41.27496338 C163.35864054 45.14705833 163.36332869 49.01906489 163.36460447 52.89119625 C163.36602656 55.31213995 163.37029732 57.73306121 163.37559891 60.15399933 C163.39410394 68.60523402 163.40226921 77.05640563 163.4006958 85.50765991 C163.39949529 93.37615066 163.42057853 101.2443667 163.45218313 109.11278796 C163.47837207 115.87473421 163.48906195 122.63659091 163.48778498 129.39858747 C163.48727598 133.43423698 163.49292441 137.46964254 163.51414108 141.50524139 C163.53356699 145.30402265 163.53361864 149.10232841 163.51910782 152.90112686 C163.51702376 154.29102654 163.52169662 155.68095631 163.53382874 157.0708046 C163.63064183 168.93555152 161.22221653 175.52080017 153.11993408 184.28695679 C150.27014875 186.98759447 147.56582477 188.56755321 144.03009033 190.26742554 C143.42618847 190.62413645 142.82228661 190.98084736 142.20008469 191.34836769 C139.38285843 192.5415477 137.1186836 192.52520363 134.06018066 192.53485107 C132.22657486 192.54764603 132.22657486 192.54764603 130.35592651 192.56069946 C129.00415026 192.56000045 127.65237411 192.5590774 126.30059814 192.55795288 C124.87457935 192.56393844 123.44856379 192.57074405 122.02255249 192.57830811 C118.15045754 192.59597575 114.27845098 192.60066389 110.40631962 192.60193968 C107.98537592 192.60336177 105.56445466 192.60763253 103.14351654 192.61293411 C94.69228185 192.63143915 86.24111024 192.63960441 77.78985596 192.63803101 C69.92136521 192.63683049 62.05314917 192.65791373 54.18472791 192.68951833 C47.42278166 192.71570727 40.66092496 192.72639716 33.8989284 192.72512019 C29.86327888 192.72461118 25.82787333 192.73025962 21.79227448 192.75147629 C17.99349322 192.77090219 14.19518746 192.77095385 10.39638901 192.75644302 C9.00648933 192.75435896 7.61655956 192.75903183 6.22671127 192.77116394 C-5.63803565 192.86797704 -12.22328431 190.45955173 -20.98944092 182.35726929 C-23.69007861 179.50748396 -25.27003734 176.80315997 -26.96990967 173.26742554 C-27.32662058 172.66352367 -27.68333149 172.05962181 -28.05085182 171.43741989 C-29.24403183 168.62019364 -29.22768776 166.3560188 -29.23733521 163.29751587 C-29.24586517 162.075112 -29.25439514 160.85270813 -29.26318359 159.59326172 C-29.26248459 158.24148547 -29.26156153 156.88970931 -29.26043701 155.53793335 C-29.26642257 154.11191455 -29.27322818 152.68589899 -29.28079224 151.2598877 C-29.29845988 147.38779274 -29.30314802 143.51578619 -29.30442381 139.64365482 C-29.3058459 137.22271113 -29.31011666 134.80178987 -29.31541824 132.38085175 C-29.33392328 123.92961705 -29.34208854 115.47844544 -29.34051514 107.02719116 C-29.33931462 99.15870042 -29.36039786 91.29048437 -29.39200246 83.42206311 C-29.4181914 76.66011686 -29.42888129 69.89826016 -29.42760432 63.13626361 C-29.42709531 59.10061409 -29.43274375 55.06520853 -29.45396042 51.02960968 C-29.47338632 47.23082842 -29.47343798 43.43252267 -29.45892715 39.63372421 C-29.45684309 38.24382454 -29.46151596 36.85389477 -29.47364807 35.46404648 C-29.57046117 23.59929956 -27.16203586 17.0140509 -19.05975342 8.24789429 C-16.20996809 5.5472566 -13.5056441 3.96729786 -9.96990967 2.26742554 C-9.3660078 1.91071463 -8.76210594 1.55400372 -8.13990402 1.18648338 C-5.32267777 -0.00669663 -3.05850293 0.00964745 0 0 Z"
                            fill="#040707" transform="translate(28.96990966796875,-0.267425537109375)"/>
                        <path
                            d="M0 0 C69.15867003 0 69.15867003 0 86.60546875 16.3203125 C96.2607962 27.12545871 100.6588566 40.1036397 100.28125 54.515625 C99.09555807 69.2050306 92.6403778 80.94218717 82 91 C75.97607376 95.9592323 69.10089652 101 61 101 C59.15135737 93.85751712 57.41626671 86.68704743 55.75 79.5 C55.56276367 78.72285645 55.37552734 77.94571289 55.18261719 77.14501953 C53.6605808 70.47337821 53.6605808 70.47337821 55 67 C55.928125 66.443125 56.85625 65.88625 57.8125 65.3125 C62.54142834 61.88170885 64.35238285 57.58171936 65.3828125 51.8828125 C65.67786326 46.8276094 64.2577339 42.79148692 61 39 C57.08312453 35.42607676 53.31213672 33.67738317 48 33.375 C42.70291537 33.68467572 38.84385735 35.33327893 35 39 C31.51693504 43.70312162 30.25350858 48.13471025 31 54 C33.12803967 60.49612109 36.3592823 64.23952153 42 68 C41.67381545 74.14126771 41.07899677 80.06545141 39.6875 86.0625 C38.07994321 93.13890194 36.98907922 100.25885726 35.9375 107.4375 C35.77531982 108.54424072 35.61313965 109.65098145 35.44604492 110.79125977 C34.23281433 119.18661851 33.12120708 127.5909469 32 136 C21.44 136 10.88 136 0 136 C0 91.12 0 46.24 0 0 Z"
                            fill="#FBFBFB" transform="translate(51,28)"/>
                    </g>
                </svg>

            </div>
        )
    };

    // Normalize provider name for lookup
    const normalizedName = providerName.toLowerCase();

    // Return known provider logo or generate a default
    return knownProviders[normalizedName] || (
        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-secondary-foreground">
            <span className="text-lg font-semibold">{providerName.substring(0, 2).toUpperCase()}</span>
        </div>
    );
};

export default function OAuthProvidersPage() {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<OAuthProvider | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<OAuthProvider | null>(null);
    const [activeTab, setActiveTab] = useState('active');

    // Get all OAuth providers
    const {data: providers, isLoading} = useQuery({
        queryKey: ['oauth-providers'],
        queryFn: async () => {
            const response = await fetch('/api/admin/oauth/providers?includeAll=true');
            if (!response.ok) throw new Error('Failed to fetch OAuth providers');
            return response.json();
        }
    });

    // Create provider form
    const createForm = useForm<ProviderFormValues>({
        resolver: zodResolver(providerFormSchema),
        defaultValues: {
            name: '',
            urlMode: 'preset',
            preset: '',
            baseUrl: '',
            authorizationUrl: '',
            tokenUrl: '',
            userInfoUrl: '',
            clientId: '',
            clientSecret: '',
            scopes: 'openid,profile,email',
            enabled: true,
            isDefault: false
        }
    });

    // Edit provider form
    const editForm = useForm<ProviderFormValues>({
        resolver: zodResolver(providerFormSchema),
        defaultValues: {
            name: '',
            urlMode: 'custom',
            authorizationUrl: '',
            tokenUrl: '',
            userInfoUrl: '',
            clientId: '',
            clientSecret: '',
            scopes: '',
            enabled: true,
            isDefault: false
        }
    });

    // Watch form values for dynamic updates
    const watchCreateUrlMode = createForm.watch('urlMode');
    const watchCreatePreset = createForm.watch('preset');
    const watchEditUrlMode = editForm.watch('urlMode');
    const watchEditPreset = editForm.watch('preset');

    // Update URLs when preset changes (create form)
    React.useEffect(() => {
        if (watchCreateUrlMode === 'preset' && watchCreatePreset && PROVIDER_PRESETS[watchCreatePreset as keyof typeof PROVIDER_PRESETS]) {
            const preset = PROVIDER_PRESETS[watchCreatePreset as keyof typeof PROVIDER_PRESETS];
            createForm.setValue('name', preset.name);
            createForm.setValue('scopes', preset.defaultScopes);
        }
    }, [watchCreateUrlMode, watchCreatePreset, createForm]);

    // Update URLs when preset changes (edit form)
    React.useEffect(() => {
        if (watchEditUrlMode === 'preset' && watchEditPreset && PROVIDER_PRESETS[watchEditPreset as keyof typeof PROVIDER_PRESETS]) {
            const preset = PROVIDER_PRESETS[watchEditPreset as keyof typeof PROVIDER_PRESETS];
            editForm.setValue('name', preset.name);
            editForm.setValue('authorizationUrl', preset.authorizationUrl);
            editForm.setValue('tokenUrl', preset.tokenUrl);
            editForm.setValue('userInfoUrl', preset.userInfoUrl);
            editForm.setValue('scopes', preset.defaultScopes);
        }
    }, [watchEditUrlMode, watchEditPreset, editForm]);

    // Add provider mutation
    const addProvider = useMutation({
        mutationFn: async (data: ProviderFormValues) => {
            const finalData: ProviderApiData = {
                name: data.name,
                clientId: data.clientId,
                clientSecret: data.clientSecret,
                scopes: data.scopes.split(',').map(s => s.trim()).filter(Boolean),
                enabled: data.enabled,
                isDefault: data.isDefault,
                authorizationUrl: '',
                tokenUrl: '',
                userInfoUrl: ''
            };

            if (data.urlMode === 'preset' && data.preset) {
                const preset = PROVIDER_PRESETS[data.preset as keyof typeof PROVIDER_PRESETS];
                finalData.authorizationUrl = preset.authorizationUrl;
                finalData.tokenUrl = preset.tokenUrl;
                finalData.userInfoUrl = preset.userInfoUrl;
            } else if (data.urlMode === 'custom') {
                finalData.authorizationUrl = data.authorizationUrl || '';
                finalData.tokenUrl = data.tokenUrl || '';
                finalData.userInfoUrl = data.userInfoUrl || '';
            }

            const response = await fetch('/api/admin/oauth/providers', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(finalData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add provider');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['oauth-providers']});
            toast({
                title: 'Provider Added',
                description: 'The OAuth provider has been added successfully.'
            });
            setIsAddDialogOpen(false);
            createForm.reset();
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Add Provider',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Edit provider mutation
    const updateProvider = useMutation({
        mutationFn: async (data: ProviderFormValues & { id: string }) => {
            const updateData: ProviderApiData = {
                name: data.name,
                clientId: data.clientId,
                clientSecret: data.clientSecret,
                scopes: data.scopes.split(',').map(s => s.trim()).filter(Boolean),
                enabled: data.enabled,
                isDefault: data.isDefault,
                authorizationUrl: '',
                tokenUrl: '',
                userInfoUrl: ''
            };

            if (data.urlMode === 'preset' && data.preset) {
                const preset = PROVIDER_PRESETS[data.preset as keyof typeof PROVIDER_PRESETS];
                updateData.authorizationUrl = preset.authorizationUrl;
                updateData.tokenUrl = preset.tokenUrl;
                updateData.userInfoUrl = preset.userInfoUrl;
            } else if (data.urlMode === 'custom') {
                updateData.authorizationUrl = data.authorizationUrl || '';
                updateData.tokenUrl = data.tokenUrl || '';
                updateData.userInfoUrl = data.userInfoUrl || '';
            }

            const response = await fetch(`/api/admin/oauth/providers/${data.id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update provider');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['oauth-providers']});
            toast({
                title: 'Provider Updated',
                description: 'The OAuth provider has been updated successfully.'
            });
            setIsEditDialogOpen(false);
            setSelectedProvider(null);
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Update Provider',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Delete provider mutation
    const deleteProvider = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/admin/oauth/providers/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete provider');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['oauth-providers']});
            toast({
                title: 'Provider Deleted',
                description: 'The OAuth provider has been deleted successfully.'
            });
            setProviderToDelete(null);
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Delete Provider',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Handle create form submission
    const onCreateSubmit = (data: ProviderFormValues) => {
        addProvider.mutate(data);
    };

    // Handle edit form submission
    const onEditSubmit = (data: ProviderFormValues) => {
        if (!selectedProvider) return;
        updateProvider.mutate({...data, id: selectedProvider.id});
    };

    // Handle edit provider
    const handleEditProvider = (provider: OAuthProvider) => {
        setSelectedProvider(provider);

        // Check if this matches a preset
        let matchedPreset = '';
        let urlMode: 'preset' | 'custom' = 'custom';

        for (const [key, preset] of Object.entries(PROVIDER_PRESETS)) {
            if (
                provider.authorizationUrl === preset.authorizationUrl &&
                provider.tokenUrl === preset.tokenUrl &&
                provider.userInfoUrl === preset.userInfoUrl
            ) {
                matchedPreset = key;
                urlMode = 'preset';
                break;
            }
        }

        editForm.reset({
            name: provider.name,
            urlMode,
            preset: matchedPreset || '',
            authorizationUrl: provider.authorizationUrl,
            tokenUrl: provider.tokenUrl,
            userInfoUrl: provider.userInfoUrl,
            clientId: provider.clientId,
            clientSecret: provider.clientSecret,
            scopes: provider.scopes.join(','),
            enabled: provider.enabled,
            isDefault: provider.isDefault
        });

        setIsEditDialogOpen(true);
    };

    // Filter providers based on active tab
    const filteredProviders = providers?.providers?.filter((provider: OAuthProvider) => {
        if (activeTab === 'active') return provider.enabled;
        if (activeTab === 'disabled') return !provider.enabled;
        return true; // "all" tab
    });

    // Only allow admins to access this page
    if (user?.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <X className="h-5 w-5"/>
                            Access Denied
                        </CardTitle>
                        <CardDescription>
                            You do not have permission to access OAuth provider settings.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="space-y-6"
        >
            {/* Add Provider Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5"/>
                            Add OAuth Provider
                        </DialogTitle>
                        <DialogDescription>
                            Configure a new OAuth provider for single sign-on.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Basic Information</h3>

                                <FormField
                                    control={createForm.control}
                                    name="name"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Provider Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Custom Provider" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                A descriptive name for the OAuth provider.
                                            </FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                {/* URL Configuration */}
                                <FormField
                                    control={createForm.control}
                                    name="urlMode"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>URL Configuration</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose configuration method"/>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="preset">
                                                        <div className="flex items-center gap-2">
                                                            <Globe className="h-4 w-4"/>
                                                            Use Provider Preset
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="custom">
                                                        <div className="flex items-center gap-2">
                                                            <Link2 className="h-4 w-4"/>
                                                            Custom URLs
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Choose whether to use a predefined provider or configure custom URLs.
                                            </FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                {/* Preset Selection */}
                                {watchCreateUrlMode === 'preset' && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={createForm.control}
                                            name="preset"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>Select Provider</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Choose a provider preset"/>
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    <div className="flex items-center gap-2">
                                                                        <ProviderLogo providerName={preset.name}/>
                                                                        <span>{preset.name}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Select from common OAuth providers with preconfigured URLs.
                                                    </FormDescription>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Show preset URLs preview */}
                                        {watchCreatePreset && PROVIDER_PRESETS[watchCreatePreset as keyof typeof PROVIDER_PRESETS] && (
                                            <div className="space-y-2 p-4 bg-muted/30 rounded-md border">
                                                <h4 className="text-sm font-medium">Provider URLs (Auto-configured)</h4>
                                                <div className="space-y-1 text-xs">
                                                    <div>
                                                        <strong>Authorization:</strong> {PROVIDER_PRESETS[watchCreatePreset as keyof typeof PROVIDER_PRESETS].authorizationUrl}
                                                    </div>
                                                    <div>
                                                        <strong>Token:</strong> {PROVIDER_PRESETS[watchCreatePreset as keyof typeof PROVIDER_PRESETS].tokenUrl}
                                                    </div>
                                                    <div><strong>User
                                                        Info:</strong> {PROVIDER_PRESETS[watchCreatePreset as keyof typeof PROVIDER_PRESETS].userInfoUrl}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Custom URLs */}
                                {watchCreateUrlMode === 'custom' && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-1 gap-4">
                                            <FormField
                                                control={createForm.control}
                                                name="authorizationUrl"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Authorization URL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="https://provider.com/oauth/authorize" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            The OAuth authorization endpoint URL.
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={createForm.control}
                                                name="tokenUrl"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Token URL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="https://provider.com/oauth/token" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            The OAuth token exchange endpoint URL.
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={createForm.control}
                                                name="userInfoUrl"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>User Info URL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="https://provider.com/oauth/userinfo" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            The endpoint to fetch user information.
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <Separator/>

                            {/* OAuth Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">OAuth Configuration</h3>

                                {/* Callback URL section */}
                                <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-sm font-medium">Callback URL</FormLabel>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const url = `${window.location.origin}/api/auth/oauth/callback/${createForm.watch('name')?.toLowerCase().replace(/\s+/g, '-') || 'provider'}`;
                                                navigator.clipboard.writeText(url);
                                                toast({
                                                    title: 'Copied to clipboard',
                                                    description: 'Callback URL has been copied to your clipboard.'
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4 mr-1"/>
                                            Copy
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code
                                            className="flex-1 p-2 text-xs bg-background rounded border overflow-x-auto text-muted-foreground">
                                            {`${window.location.origin}/api/auth/oauth/callback/${createForm.watch('name')?.toLowerCase().replace(/\s+/g, '-') || 'provider'}`}
                                        </code>
                                    </div>
                                    <FormDescription>
                                        Use this URL as the callback URL (redirect URI) in your OAuth provider
                                        configuration.
                                    </FormDescription>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={createForm.control}
                                        name="clientId"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Client ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="client_id" {...field} />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={createForm.control}
                                        name="clientSecret"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Client Secret</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="client_secret" type="password" {...field} />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={createForm.control}
                                    name="scopes"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Scopes</FormLabel>
                                            <FormControl>
                                                <Input placeholder="openid,profile,email" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Comma-separated list of OAuth scopes.
                                            </FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={createForm.control}
                                        name="enabled"
                                        render={({field}) => (
                                            <FormItem
                                                className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Enabled</FormLabel>
                                                    <FormDescription>
                                                        Allow users to sign in with this provider.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={createForm.control}
                                        name="isDefault"
                                        render={({field}) => (
                                            <FormItem
                                                className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Default Provider</FormLabel>
                                                    <FormDescription>
                                                        Make this the default sign-in option.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={addProvider.isPending}>
                                    {addProvider.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Adding...
                                        </>
                                    ) : (
                                        'Add Provider'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Provider Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5"/>
                            Edit {selectedProvider?.name || 'OAuth Provider'}
                        </DialogTitle>
                        <DialogDescription>
                            Update the OAuth provider configuration.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Basic Information</h3>

                                <FormField
                                    control={editForm.control}
                                    name="name"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Provider Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Custom Provider" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                A descriptive name for the OAuth provider.
                                            </FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                {/* URL Configuration */}
                                <FormField
                                    control={editForm.control}
                                    name="urlMode"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>URL Configuration</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose configuration method"/>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="preset">
                                                        <div className="flex items-center gap-2">
                                                            <Globe className="h-4 w-4"/>
                                                            Use Provider Preset
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="custom">
                                                        <div className="flex items-center gap-2">
                                                            <Link2 className="h-4 w-4"/>
                                                            Custom URLs
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Choose whether to use a predefined provider or configure custom URLs.
                                            </FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                {/* Preset Selection */}
                                {watchEditUrlMode === 'preset' && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={editForm.control}
                                            name="preset"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>Select Provider</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Choose a provider preset"/>
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    <div className="flex items-center gap-2">
                                                                        <ProviderLogo providerName={preset.name}/>
                                                                        <span>{preset.name}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Select from common OAuth providers with preconfigured URLs.
                                                    </FormDescription>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Show preset URLs preview */}
                                        {watchEditPreset && PROVIDER_PRESETS[watchEditPreset as keyof typeof PROVIDER_PRESETS] && (
                                            <div className="space-y-2 p-4 bg-muted/30 rounded-md border">
                                                <h4 className="text-sm font-medium">Provider URLs (Auto-configured)</h4>
                                                <div className="space-y-1 text-xs">
                                                    <div>
                                                        <strong>Authorization:</strong> {PROVIDER_PRESETS[watchEditPreset as keyof typeof PROVIDER_PRESETS].authorizationUrl}
                                                    </div>
                                                    <div>
                                                        <strong>Token:</strong> {PROVIDER_PRESETS[watchEditPreset as keyof typeof PROVIDER_PRESETS].tokenUrl}
                                                    </div>
                                                    <div><strong>User
                                                        Info:</strong> {PROVIDER_PRESETS[watchEditPreset as keyof typeof PROVIDER_PRESETS].userInfoUrl}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Custom URLs */}
                                {watchEditUrlMode === 'custom' && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-1 gap-4">
                                            <FormField
                                                control={editForm.control}
                                                name="authorizationUrl"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Authorization URL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="https://provider.com/oauth/authorize" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            The OAuth authorization endpoint URL.
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={editForm.control}
                                                name="tokenUrl"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Token URL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="https://provider.com/oauth/token" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            The OAuth token exchange endpoint URL.
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={editForm.control}
                                                name="userInfoUrl"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>User Info URL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="https://provider.com/oauth/userinfo" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            The endpoint to fetch user information.
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <Separator/>

                            {/* OAuth Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">OAuth Configuration</h3>

                                {/* Callback URL section */}
                                <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-sm font-medium">Callback URL</FormLabel>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const url = `${window.location.origin}/api/auth/oauth/callback/${editForm.watch('name')?.toLowerCase().replace(/\s+/g, '-') || 'provider'}`;
                                                navigator.clipboard.writeText(url);
                                                toast({
                                                    title: 'Copied to clipboard',
                                                    description: 'Callback URL has been copied to your clipboard.'
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4 mr-1"/>
                                            Copy
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code
                                            className="flex-1 p-2 text-xs bg-background rounded border overflow-x-auto text-muted-foreground">
                                            {`${window.location.origin}/api/auth/oauth/callback/${editForm.watch('name')?.toLowerCase().replace(/\s+/g, '-') || 'provider'}`}
                                        </code>
                                    </div>
                                    <FormDescription>
                                        Use this URL as the callback URL (redirect URI) in your OAuth provider
                                        configuration.
                                    </FormDescription>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={editForm.control}
                                        name="clientId"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Client ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="client_id" {...field} />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="clientSecret"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Client Secret</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="client_secret" type="password" {...field} />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={editForm.control}
                                    name="scopes"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Scopes</FormLabel>
                                            <FormControl>
                                                <Input placeholder="openid,profile,email" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Comma-separated list of OAuth scopes.
                                            </FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={editForm.control}
                                        name="enabled"
                                        render={({field}) => (
                                            <FormItem
                                                className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Enabled</FormLabel>
                                                    <FormDescription>
                                                        Allow users to sign in with this provider.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="isDefault"
                                        render={({field}) => (
                                            <FormItem
                                                className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Default Provider</FormLabel>
                                                    <FormDescription>
                                                        Make this the default sign-in option.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateProvider.isPending}>
                                    {updateProvider.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Provider'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            {/* Delete Provider Dialog */}
            <AlertDialog open={!!providerToDelete} onOpenChange={(isOpen) => !isOpen && setProviderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-destructive"/>
                            Delete {providerToDelete?.name || 'OAuth Provider'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this OAuth provider? This action cannot be undone.
                            Users who previously signed in with this provider may lose access.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => providerToDelete && deleteProvider.mutate(providerToDelete.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteProvider.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4"/>
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">OAuth Providers</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage single sign-on providers for Changerawr with custom URLs support
                    </p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} className="sm:self-start">
                    <Plus className="mr-2 h-4 w-4"/>
                    Add Provider
                </Button>
            </div>

            {/* Filter tabs */}
            <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                    <TabsTrigger value="active" className="flex items-center gap-1">
                        <Check className="h-4 w-4"/>
                        <span>Active</span>
                        {providers?.providers && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {providers.providers.filter((p: OAuthProvider) => p.enabled).length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="disabled" className="flex items-center gap-1">
                        <X className="h-4 w-4"/>
                        <span>Disabled</span>
                        {providers?.providers && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {providers.providers.filter((p: OAuthProvider) => !p.enabled).length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-1">
                        <Settings className="h-4 w-4"/>
                        <span>All</span>
                        {providers?.providers && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {providers.providers.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                    <ProvidersList
                        providers={filteredProviders}
                        isLoading={isLoading}
                        onEdit={handleEditProvider}
                        onDelete={setProviderToDelete}
                        setIsAddDialogOpen={setIsAddDialogOpen}
                    />
                </TabsContent>

                <TabsContent value="disabled" className="mt-4">
                    <ProvidersList
                        providers={filteredProviders}
                        isLoading={isLoading}
                        onEdit={handleEditProvider}
                        onDelete={setProviderToDelete}
                        setIsAddDialogOpen={setIsAddDialogOpen}
                    />
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                    <ProvidersList
                        providers={filteredProviders}
                        isLoading={isLoading}
                        onEdit={handleEditProvider}
                        onDelete={setProviderToDelete}
                        setIsAddDialogOpen={setIsAddDialogOpen}
                    />
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}

interface ProvidersListProps {
    providers: OAuthProvider[];
    isLoading: boolean;
    onEdit: (provider: OAuthProvider) => void;
    onDelete: (provider: OAuthProvider) => void;
    setIsAddDialogOpen: (open: boolean) => void;
}

const ProvidersList: React.FC<ProvidersListProps> = ({
                                                         providers,
                                                         isLoading,
                                                         onEdit,
                                                         onDelete,
                                                         setIsAddDialogOpen
                                                     }) => {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({length: 3}).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-muted"></div>
                                <div>
                                    <div className="h-6 w-24 bg-muted rounded"></div>
                                    <div className="h-4 w-32 bg-muted rounded mt-1"></div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-4 w-full bg-muted rounded my-2"></div>
                            <div className="h-4 w-3/4 bg-muted rounded my-2"></div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <div className="h-9 w-20 bg-muted rounded"></div>
                            <div className="h-9 w-20 bg-muted rounded"></div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    }

    if (!providers?.length) {
        return (
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>No OAuth Providers</CardTitle>
                    <CardDescription>
                        Add an OAuth provider to enable single sign-on for your users with custom URL support.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <div className="text-center">
                        <Fingerprint className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                        <p className="text-sm text-muted-foreground max-w-md mb-6">
                            OAuth providers allow your users to sign in using their existing accounts from services like
                            Microsoft, Google, GitHub, or any custom identity provider with configurable URLs.
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4"/>
                        Add Provider
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
                {providers.map((provider: OAuthProvider) => (
                    <motion.div
                        key={provider.id}
                        initial={{opacity: 0, scale: 0.95}}
                        animate={{opacity: 1, scale: 1}}
                        exit={{opacity: 0, scale: 0.95}}
                        transition={{duration: 0.2}}
                    >
                        <Card className={!provider.enabled ? "opacity-80 border-dashed" : ""}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <ProviderLogo providerName={provider.name}/>
                                    <div>
                                        <CardTitle className="flex items-center text-lg">
                                            {provider.name}
                                            {provider.isDefault && (
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    Default
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            {provider.enabled ? (
                                                <span className="flex items-center text-green-600 text-xs">
                                                    <Check className="mr-1 h-3 w-3"/>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-muted-foreground text-xs">
                                                    <X className="mr-1 h-3 w-3"/>
                                                    Disabled
                                                </span>
                                            )}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center">
                                        <KeyRound className="h-4 w-4 mr-2 text-muted-foreground"/>
                                        <span className="font-medium">Client ID:</span>
                                        <span className="ml-2 truncate text-muted-foreground">
                                            {provider.clientId.substring(0, 12)}...
                                        </span>
                                    </div>

                                    {/* Debug URL Display */}
                                    {/*<div className="space-y-1">*/}
                                    {/*    <div className="flex items-start">*/}
                                    {/*        <Globe className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />*/}
                                    {/*        <div className="flex-1 min-w-0">*/}
                                    {/*            <div className="text-xs text-muted-foreground">Authorization URL:</div>*/}
                                    {/*            <div className="text-xs font-mono bg-muted px-1 py-0.5 rounded truncate">*/}
                                    {/*                {provider.authorizationUrl}*/}
                                    {/*            </div>*/}
                                    {/*        </div>*/}
                                    {/*    </div>*/}

                                    {/*    <div className="flex items-start ml-6">*/}
                                    {/*        <div className="flex-1 min-w-0">*/}
                                    {/*            <div className="text-xs text-muted-foreground">Token URL:</div>*/}
                                    {/*            <div className="text-xs font-mono bg-muted px-1 py-0.5 rounded truncate">*/}
                                    {/*                {provider.tokenUrl}*/}
                                    {/*            </div>*/}
                                    {/*        </div>*/}
                                    {/*    </div>*/}

                                    {/*    <div className="flex items-start ml-6">*/}
                                    {/*        <div className="flex-1 min-w-0">*/}
                                    {/*            <div className="text-xs text-muted-foreground">User Info URL:</div>*/}
                                    {/*            <div className="text-xs font-mono bg-muted px-1 py-0.5 rounded truncate">*/}
                                    {/*                {provider.userInfoUrl}*/}
                                    {/*            </div>*/}
                                    {/*        </div>*/}
                                    {/*    </div>*/}
                                    {/*</div>*/}

                                    <div className="flex flex-wrap gap-1">
                                        {provider.scopes.map((scope, index) => (
                                            <Badge key={index} variant="outline" className="text-xs font-normal">
                                                {scope}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={() => {
                                                try {
                                                    const url = new URL(provider.authorizationUrl);
                                                    window.open(url.origin, '_blank', 'noopener,noreferrer');
                                                } catch {
                                                    // Fallback if URL parsing fails
                                                    window.open(provider.authorizationUrl, '_blank', 'noopener,noreferrer');
                                                }
                                            }}
                                            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ExternalLink className="h-3 w-3 mr-1"/>
                                            View Provider
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEdit(provider)}
                                >
                                    <Pencil className="h-4 w-4 mr-2"/>
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => onDelete(provider)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2"/>
                                    Delete
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};