import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trash2, Tag, Percent, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSalesAdmin } from '@/hooks/useSalesAdmin';

interface Plan {
    id: string;
    stripe_price_id: string;
    title: string;
    price_brl: number;
    period_label: string;
    has_badge: boolean;
    is_test: boolean;
    active: boolean;
}

interface Settings {
    discount_active: boolean;
    discount_percentage: number;
    store_fee_percentage?: number;
    courier_fee_percentage?: number;
    lojista_terms_url?: string;
    courier_terms_url?: string;
}

export default function AdminSales() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isSalesAdmin, isLoading } = useSalesAdmin();
    const queryClient = useQueryClient();

    const [saving, setSaving] = useState(false);

    const { data, isLoading: loadingSales } = useQuery<{ settings: Settings, plans: Plan[] }>({
        queryKey: ['admin_sales'],
        queryFn: async () => {
            const [settsRes, plansRes] = await Promise.all([
                (supabase as any).from('sales_settings').select('*').eq('id', 1).single(),
                (supabase as any).from('subscription_plans').select('*').order('created_at', { ascending: false })
            ]);
            return {
                settings: settsRes.data || { discount_active: false, discount_percentage: 0 },
                plans: (plansRes.data as Plan[]) || []
            };
        },
        enabled: isSalesAdmin
    });

    const settings = data?.settings || { discount_active: false, discount_percentage: 0 };
    const plans = data?.plans || [];

    const [localSettings, setLocalSettings] = useState<Partial<Settings>>({ discount_active: undefined, discount_percentage: undefined });

    const [newPlan, setNewPlan] = useState({
        stripe_price_id: '',
        title: '',
        price_brl: '',
        period_label: '',
        has_badge: false,
        is_test: false
    });



    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const { error } = await (supabase as any).from('sales_settings').upsert({
                id: 1,
                discount_active: localSettings.discount_active ?? settings.discount_active,
                discount_percentage: Number(localSettings.discount_percentage ?? settings.discount_percentage) || 0,
                store_fee_percentage: Number(localSettings.store_fee_percentage ?? settings.store_fee_percentage ?? 10),
                courier_fee_percentage: Number(localSettings.courier_fee_percentage ?? settings.courier_fee_percentage ?? 85),
                lojista_terms_url: localSettings.lojista_terms_url ?? settings.lojista_terms_url ?? '/terms',
                courier_terms_url: localSettings.courier_terms_url ?? settings.courier_terms_url ?? '/terms'
            });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['admin_sales'] });
            toast.success('Configurações de Venda salvas!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlan.stripe_price_id || !newPlan.title || !newPlan.price_brl) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }

        setSaving(true);
        try {
            const { error } = await (supabase as any).from('subscription_plans').insert([{
                stripe_price_id: newPlan.stripe_price_id,
                title: newPlan.title,
                price_brl: Number(newPlan.price_brl),
                period_label: newPlan.period_label || '/mês',
                has_badge: newPlan.has_badge,
                is_test: newPlan.is_test
            }]);

            if (error) throw error;

            toast.success('Plano cadastrado com sucesso!');
            setNewPlan({ stripe_price_id: '', title: '', price_brl: '', period_label: '', has_badge: false, is_test: false });
            queryClient.invalidateQueries({ queryKey: ['admin_sales'] });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('Deseja realmente deletar este plano?')) return;
        try {
            const { error } = await (supabase as any).from('subscription_plans').delete().eq('id', id);
            if (error) throw error;
            toast.success('Plano excluído.');
            queryClient.invalidateQueries({ queryKey: ['admin_sales'] });
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const togglePlanActive = async (id: string, active: boolean) => {
        try {
            const { error } = await (supabase as any).from('subscription_plans').update({ active }).eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['admin_sales'] });
            toast.success(active ? 'Plano ativado' : 'Plano inativado');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (loadingSales || isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 glass p-4 rounded-2xl mb-2">
                <div className="w-10 h-10 rounded-xl bg-petala-500/10 flex items-center justify-center">
                    <Percent className="w-5 h-5 text-petala-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Configurações de Venda</h2>
                    <p className="text-xs text-surface-400">Exclusivo para Gerência</p>
                </div>
            </div>

                {/* Taxas & Políticas de Parceiros */}
                <Card className="border-t-4 border-t-green-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Percent className="w-5 h-5 text-green-500" /> Parceiros de Venda</CardTitle>
                        <CardDescription>Configure o percentual retido por venda e as políticas exigidas para Lojistas e Entregadores da plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border p-4 rounded-lg bg-muted/20">
                            <div className="space-y-2">
                                <Label>Taxa por venda da Loja (%)</Label>
                                <Input
                                    type="number" step="0.1" min="0" max="100"
                                    value={localSettings.store_fee_percentage !== undefined ? localSettings.store_fee_percentage : (settings.store_fee_percentage ?? 10)}
                                    onChange={e => setLocalSettings(prev => ({ ...settings, ...prev, store_fee_percentage: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ganhos de Entrega do Courier (%)</Label>
                                <Input
                                    type="number" step="0.1" min="0" max="100"
                                    value={localSettings.courier_fee_percentage !== undefined ? localSettings.courier_fee_percentage : (settings.courier_fee_percentage ?? 85)}
                                    onChange={e => setLocalSettings(prev => ({ ...settings, ...prev, courier_fee_percentage: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Termos para Lojistas (Link)</Label>
                                <Input
                                    value={localSettings.lojista_terms_url !== undefined ? localSettings.lojista_terms_url : (settings.lojista_terms_url || '/terms')}
                                    onChange={e => setLocalSettings(prev => ({ ...settings, ...prev, lojista_terms_url: e.target.value }))}
                                    placeholder="/terms"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Termos para Entregadores (Link)</Label>
                                <Input
                                    value={localSettings.courier_terms_url !== undefined ? localSettings.courier_terms_url : (settings.courier_terms_url || '/terms')}
                                    onChange={e => setLocalSettings(prev => ({ ...settings, ...prev, courier_terms_url: e.target.value }))}
                                    placeholder="/terms"
                                />
                            </div>
                        </div>
                        <Button onClick={handleSaveSettings} disabled={saving} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Configurações de Parceiros
                        </Button>
                    </CardContent>
                </Card>

                {/* Global Descontos */}
                <Card className="border-t-4 border-t-amber-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-amber-500" /> Promoção Global</CardTitle>
                        <CardDescription>Ative um desconto global festivo (Natal, Black Friday) para influenciar visualmente todos os planos na tela de Assinatura.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border border-border p-4 rounded-lg bg-muted/50">
                            <div className="space-y-0.5">
                                <Label className="text-base text-foreground">Desconto Visível Ativo</Label>
                                <p className="text-sm text-muted-foreground">Se ativo, os botões mostrarão os preços originais cortados.</p>
                            </div>
                            <Switch
                                checked={localSettings.discount_active !== undefined ? localSettings.discount_active : settings.discount_active}
                                onCheckedChange={(val) => setLocalSettings(prev => ({ ...settings, ...prev, discount_active: val }))}
                            />
                        </div>
                        {(localSettings.discount_active !== undefined ? localSettings.discount_active : settings.discount_active) && (
                            <div className="grid gap-2 p-4 border rounded-lg">
                                <Label>Porcentagem de Desconto (%)</Label>
                                <div className="flex gap-4">
                                    <Input
                                        type="number"
                                        min="1" max="99"
                                        value={localSettings.discount_percentage !== undefined ? localSettings.discount_percentage : settings.discount_percentage}
                                        onChange={e => setLocalSettings(prev => ({ ...settings, ...prev, discount_percentage: Number(e.target.value) }))}
                                        className="w-32"
                                    />
                                    <Button onClick={handleSaveSettings} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Ajustes
                                    </Button>
                                </div>
                            </div>
                        )}
                        {!(localSettings.discount_active !== undefined ? localSettings.discount_active : settings.discount_active) && (
                            <Button onClick={handleSaveSettings} disabled={saving} variant="outline" className="w-full">
                                Gravar Estado Desativado
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Criar Novo Plano */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-green-600" /> Cadastrar Novo Plano Stripe</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ID do Preço na Stripe (price_1x...)</Label>
                                <Input required value={newPlan.stripe_price_id} onChange={e => setNewPlan({ ...newPlan, stripe_price_id: e.target.value })} placeholder="price_1..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Título do Botão (Ex: Mensal)</Label>
                                <Input required value={newPlan.title} onChange={e => setNewPlan({ ...newPlan, title: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Preço Cheio em R$ (Ex: 19.90)</Label>
                                <Input type="number" step="0.01" required value={newPlan.price_brl} onChange={e => setNewPlan({ ...newPlan, price_brl: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Afixo Visual (Ex: /mês, /ano)</Label>
                                <Input value={newPlan.period_label} onChange={e => setNewPlan({ ...newPlan, period_label: e.target.value })} placeholder="/mês" />
                            </div>
                            <div className="space-y-4 md:col-span-2 flex flex-col sm:flex-row gap-6 p-4 bg-muted/50 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <Switch checked={newPlan.has_badge} onCheckedChange={v => setNewPlan({ ...newPlan, has_badge: v })} />
                                    <Label className="cursor-pointer">Destacar com Badge (Melhor Opção)</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch checked={newPlan.is_test} onCheckedChange={v => setNewPlan({ ...newPlan, is_test: v })} />
                                    <Label className="cursor-pointer text-amber-600">É um plano fictício (Modo Teste)?</Label>
                                </div>
                            </div>
                            <Button type="submit" disabled={saving} className="md:col-span-2 h-12">
                                Cadastrar Plano no App
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Planos Atuais */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Planos Configurados</CardTitle>
                        <CardDescription>Você pode desativar para esconder da UI, ou excluir de vez.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {plans.length === 0 ? (
                            <p className="text-muted-foreground text-center p-4">Nenhum plano cadastrado. Adicione seu primeiro plano Stripe!</p>
                        ) : plans.map(plan => (
                            <div key={plan.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl gap-4 ${!plan.active && 'opacity-60 bg-muted/30'}`}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-foreground">{plan.title} <span className="font-normal text-muted-foreground ml-1">R$ {plan.price_brl} {plan.period_label}</span></h3>
                                        {plan.has_badge && <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">Badge</span>}
                                        {plan.is_test && <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs px-2 py-0.5 rounded-full font-medium">TESTE</span>}
                                    </div>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">{plan.stripe_price_id}</p>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <Switch checked={plan.active} onCheckedChange={(val) => togglePlanActive(plan.id, val)} />
                                    <span className="text-sm font-medium w-12 text-foreground">{plan.active ? 'Ativo' : 'Oculto'}</span>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600 ml-2" onClick={() => handleDeletePlan(plan.id)}>
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

        </div>
    );
}
