import { useEffect, useState } from 'react';

import getFileContents from '@/api/server/files/getFileContents';
import createDirectory from '@/api/server/files/createDirectory';
import saveFileContents from '@/api/server/files/saveFileContents';
import PluginConfigEditor from '@/components/server/assettocorsa/PluginConfigEditor';

interface PluginsTabProps {
    uuid: string;
}

interface PluginState {
    exists: boolean;
    loading: boolean;
}

const CSP_PATH = 'cfg/csp_extra_options.ini';
const CM_PATH = 'cfg/ks_content_manager_wrapper.ini';

const CSP_TEMPLATES: { label: string; section: string; defaults: Record<string, string> }[] = [
    {
        label: 'Rain Support',
        section: 'EXTRA_RULES',
        defaults: { ENABLED: '1', RAIN_FX: '1' },
    },
    {
        label: 'Pit Speed Limiter',
        section: 'PITS_SPEED_LIMITER',
        defaults: { SPEED: '80', ENABLED: '1' },
    },
    {
        label: 'Custom Lighting',
        section: 'CUSTOM_LIGHTING',
        defaults: { ENABLED: '1', CAR_LIGHTS: '1', CAR_HAZARDS: '1' },
    },
    {
        label: 'Server Extra Config',
        section: 'SERVER_EXTRA_CONFIG',
        defaults: { ENABLED: '1' },
    },
];

const CM_TEMPLATES = [
    {
        label: 'Basic Wrapper',
        section: 'WRAPPER',
        defaults: { ENABLED: '1', DOWNLOAD_URL_CARS: '', DOWNLOAD_URL_TRACK: '' },
    },
];

const PluginsTab = ({ uuid }: PluginsTabProps) => {
    const [csp, setCsp] = useState<PluginState>({ exists: false, loading: true });
    const [cm, setCm] = useState<PluginState>({ exists: false, loading: true });

    useEffect(() => {
        const check = async (path: string) => {
            try {
                await getFileContents(uuid, path);
                return true;
            } catch {
                return false;
            }
        };

        Promise.allSettled([check(CSP_PATH), check(CM_PATH)]).then(([cspRes, cmRes]) => {
            setCsp({ exists: cspRes.status === 'fulfilled' && cspRes.value, loading: false });
            setCm({ exists: cmRes.status === 'fulfilled' && cmRes.value, loading: false });
        });
    }, [uuid]);

    const enablePlugin = async (path: string, defaultContent: string, setter: typeof setCsp) => {
        await createDirectory(uuid, '/', 'cfg').catch(() => {});
        await saveFileContents(uuid, path, defaultContent);
        setter({ exists: true, loading: false });
    };

    if (csp.loading || cm.loading) {
        return <p className='text-xs text-zinc-500 animate-pulse'>Detecting plugins...</p>;
    }

    return (
        <div className='flex flex-col gap-4'>
            {!csp.exists && !cm.exists && (
                <p className='text-xs text-zinc-500'>No plugin configs detected. Enable one below to get started.</p>
            )}

            {csp.exists ? (
                <PluginConfigEditor
                    uuid={uuid}
                    filePath={CSP_PATH}
                    title='Custom Shaders Patch (CSP)'
                    description='Extra server options for CSP — rain, lighting, pit limiter, etc.'
                    templates={CSP_TEMPLATES}
                />
            ) : (
                <div className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-4 flex items-center justify-between'>
                    <div>
                        <h3 className='text-sm font-semibold text-white'>Custom Shaders Patch (CSP)</h3>
                        <p className='text-[11px] text-zinc-500'>Enable rain, custom lighting, pit limiter, and more.</p>
                    </div>
                    <button
                        type='button'
                        onClick={() => enablePlugin(CSP_PATH, '; Custom Shaders Patch Extra Options\n; Add sections below to configure CSP features\n', setCsp)}
                        className='px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors'
                    >
                        Enable CSP Config
                    </button>
                </div>
            )}

            {cm.exists ? (
                <PluginConfigEditor
                    uuid={uuid}
                    filePath={CM_PATH}
                    title='Content Manager Wrapper'
                    description='Configuration for Content Manager server integration.'
                    templates={CM_TEMPLATES}
                />
            ) : (
                <div className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-4 flex items-center justify-between'>
                    <div>
                        <h3 className='text-sm font-semibold text-white'>Content Manager Wrapper</h3>
                        <p className='text-[11px] text-zinc-500'>Enable Content Manager integration for your server.</p>
                    </div>
                    <button
                        type='button'
                        onClick={() => enablePlugin(CM_PATH, '; Content Manager Wrapper Config\n', setCm)}
                        className='px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors'
                    >
                        Enable CM Wrapper
                    </button>
                </div>
            )}
        </div>
    );
};

export default PluginsTab;
