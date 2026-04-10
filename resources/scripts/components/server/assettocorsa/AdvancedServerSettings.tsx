import { Field, Toggle } from '@/components/server/assettocorsa/FormControls';

interface AdvancedServerSettingsProps {
    get: (section: string, key: string, fallback?: string) => string;
    set: (section: string, key: string, value: string) => void;
}

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
    <p className='text-sm font-bold text-[#ffffff77] mt-4 mb-2'>{children}</p>
);

const AdvancedServerSettings = ({ get, set }: AdvancedServerSettingsProps) => (
    <div className='flex flex-col'>
        <GroupLabel>Network</GroupLabel>
        <div className='grid grid-cols-3 gap-4'>
            <Field label='UDP Port' type='number' value={get('SERVER', 'UDP_PORT', '9600')} onChange={(v) => set('SERVER', 'UDP_PORT', v)} />
            <Field label='TCP Port' type='number' value={get('SERVER', 'TCP_PORT', '9600')} onChange={(v) => set('SERVER', 'TCP_PORT', v)} />
            <Field label='HTTP Port' type='number' value={get('SERVER', 'HTTP_PORT', '8081')} onChange={(v) => set('SERVER', 'HTTP_PORT', v)} />
        </div>

        <GroupLabel>Performance</GroupLabel>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <Field label='Sleep Time' type='number' value={get('SERVER', 'SLEEP_TIME', '1')} onChange={(v) => set('SERVER', 'SLEEP_TIME', v)} hint='ms between ticks' />
            <Field label='Send Rate (Hz)' type='number' value={get('SERVER', 'CLIENT_SEND_INTERVAL_HZ', '18')} onChange={(v) => set('SERVER', 'CLIENT_SEND_INTERVAL_HZ', v)} hint='Higher = smoother' />
            <Field label='Send Buffer' type='number' value={get('SERVER', 'SEND_BUFFER_SIZE', '0')} onChange={(v) => set('SERVER', 'SEND_BUFFER_SIZE', v)} hint='0 = auto' />
            <Field label='Recv Buffer' type='number' value={get('SERVER', 'RECV_BUFFER_SIZE', '0')} onChange={(v) => set('SERVER', 'RECV_BUFFER_SIZE', v)} hint='0 = auto' />
        </div>

        <GroupLabel>Race Rules</GroupLabel>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
            <Field label='Race Over Time (s)' type='number' value={get('SERVER', 'RACE_OVER_TIME', '60')} onChange={(v) => set('SERVER', 'RACE_OVER_TIME', v)} />
            <Field label='Max Ballast (kg)' type='number' value={get('SERVER', 'MAX_BALLAST_KG', '0')} onChange={(v) => set('SERVER', 'MAX_BALLAST_KG', v)} />
            <Field label='Qualify Max Wait (%)' type='number' value={get('SERVER', 'QUALIFY_MAX_WAIT_PERC', '120')} onChange={(v) => set('SERVER', 'QUALIFY_MAX_WAIT_PERC', v)} />
            <Field label='Pit Window Start' type='number' value={get('SERVER', 'RACE_PIT_WINDOW_START', '0')} onChange={(v) => set('SERVER', 'RACE_PIT_WINDOW_START', v)} />
            <Field label='Pit Window End' type='number' value={get('SERVER', 'RACE_PIT_WINDOW_END', '0')} onChange={(v) => set('SERVER', 'RACE_PIT_WINDOW_END', v)} />
            <Field label='Reversed Grid Pos' type='number' value={get('SERVER', 'REVERSED_GRID_RACE_POSITIONS', '0')} onChange={(v) => set('SERVER', 'REVERSED_GRID_RACE_POSITIONS', v)} hint='0 = off' />
            <Field label='Max Contacts/km' type='number' value={get('SERVER', 'MAX_CONTACTS_PER_KM', '25')} onChange={(v) => set('SERVER', 'MAX_CONTACTS_PER_KM', v)} hint='-1 = unlimited' />
            <Field label='Allowed Tyres Out' type='number' value={get('SERVER', 'ALLOWED_TYRES_OUT', '2')} onChange={(v) => set('SERVER', 'ALLOWED_TYRES_OUT', v)} />
            <Field label='Result Screen (s)' type='number' value={get('SERVER', 'RESULT_SCREEN_TIME', '60')} onChange={(v) => set('SERVER', 'RESULT_SCREEN_TIME', v)} />
        </div>

        <GroupLabel>Voting & Moderation</GroupLabel>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
            <Field label='Voting Quorum (%)' type='number' value={get('SERVER', 'VOTING_QUORUM', '80')} onChange={(v) => set('SERVER', 'VOTING_QUORUM', v)} />
            <Field label='Vote Duration (s)' type='number' value={get('SERVER', 'VOTE_DURATION', '20')} onChange={(v) => set('SERVER', 'VOTE_DURATION', v)} />
            <Field label='Blacklist Mode' type='number' value={get('SERVER', 'BLACKLIST_MODE', '0')} onChange={(v) => set('SERVER', 'BLACKLIST_MODE', v)} hint='0=ban, 1=kick' />
        </div>

        <GroupLabel>Display & Security</GroupLabel>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-x-8'>
            <Toggle label='Force Virtual Mirror' value={get('SERVER', 'FORCE_VIRTUAL_MIRROR', '0')} onChange={(v) => set('SERVER', 'FORCE_VIRTUAL_MIRROR', v)} />
            <Toggle label='Locked Entry List' value={get('SERVER', 'LOCKED_ENTRY_LIST', '0')} onChange={(v) => set('SERVER', 'LOCKED_ENTRY_LIST', v)} />
            <Toggle label='Race Extra Lap' value={get('SERVER', 'RACE_EXTRA_LAP', '0')} onChange={(v) => set('SERVER', 'RACE_EXTRA_LAP', v)} />
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-2'>
            <Field label='Time of Day Multiplier' type='number' value={get('SERVER', 'TIME_OF_DAY_MULT', '0')} onChange={(v) => set('SERVER', 'TIME_OF_DAY_MULT', v)} hint='0 = static, 1 = real-time' />
        </div>
    </div>
);

export default AdvancedServerSettings;
