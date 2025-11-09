import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Button } from "../components/button";
import { useNavigate } from "react-router-dom";

function Profile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ username: string; firstName?: string; lastName?: string; address?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await axios.get(`${BACKEND_URL}/api/v1/profile`, {
          headers: { Authorization: token },
        });
        setProfile(res.data);
        setFirstName(res.data.firstName || "");
        setLastName(res.data.lastName || "");
        setAddress(res.data.address || "");
      } catch (e) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function saveProfile(){
    try{
      const token = localStorage.getItem("token") || "";
      const res = await axios.patch(`${BACKEND_URL}/api/v1/profile`, {
        firstName,
        lastName,
        address
      }, {
        headers: { Authorization: token }
      });
      setProfile(res.data);
      setEditing(false);
    }catch(e){
      setError("Failed to save profile");
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!profile) {
    return <div className="p-6">No profile data.</div>;
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <Button variant="secondary" size="md" title="Back to Dashboard" onClick={() => navigate("/user/dashboard")} />
        </div>
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <div className="text-gray-500 text-sm">Username</div>
            <div className="text-gray-900">{profile.username}</div>
          </div>
          {!editing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500 text-sm">First Name</div>
                  <div className="text-gray-900">{profile.firstName || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Last Name</div>
                  <div className="text-gray-900">{profile.lastName || "—"}</div>
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Address</div>
                <div className="text-gray-900">{profile.address || "—"}</div>
              </div>
              <div className="pt-2">
                <Button variant="primary" size="md" title="Edit" onClick={() => setEditing(true)} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500 text-sm">First Name</div>
                  <input className="mt-1 w-full border rounded-md p-2" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Last Name</div>
                  <input className="mt-1 w-full border rounded-md p-2" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Address</div>
                <input className="mt-1 w-full border rounded-md p-2" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="primary" size="md" title="Save" onClick={saveProfile} />
                <Button variant="secondary" size="md" title="Cancel" onClick={() => setEditing(false)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;


