import { EvidenceWorkspace } from '@/components/EvidenceWorkspace';
export default function Page({searchParams}:{searchParams?:{businessId?:string}}){return <EvidenceWorkspace section='analyst' initialBusinessId={searchParams?.businessId}/>;}
