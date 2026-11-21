import { liveUser } from '@/lib/guard';
import { ProfileForm } from '@/components/app/ProfileForm';
import { regencyName } from '@/lib/riau';
import { dateMed } from '@/lib/format';

export const metadata = { title: 'Profil' };

export default async function Page() {
  const u = (await liveUser())!;
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Profil</h1>
          <p className="page-sub">{u.email} · {regencyName(u.regency)} · bergabung {dateMed(u.createdAt)}</p>
        </div>
      </div>
      <div className="panel" style={{ maxWidth: 720 }}>
        <div className="panel-body" style={{ paddingTop: 24 }}>
          <ProfileForm user={{ name: u.name, regency: u.regency ?? '', division: u.division ?? '', university: u.university ?? '', phone: u.phone ?? '', bio: u.bio ?? '' }} />
        </div>
      </div>
    </>
  );
}
