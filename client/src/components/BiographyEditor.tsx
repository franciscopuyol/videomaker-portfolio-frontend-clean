import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Loader2 } from "lucide-react";

interface Biography {
  id: number;
  heroTitle: string | null;
  bioText: string | null;
  locations: string[] | null;
  courses: string[] | null;
  clients: string[] | null;
  memberOf: string[] | null;
  profileImageUrl: string | null;
  updatedAt: string;
}

export default function BiographyEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [heroTitle, setHeroTitle] = useState("");
  const [bioText, setBioText] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [memberOf, setMemberOf] = useState<string[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [newLocation, setNewLocation] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newMember, setNewMember] = useState("");

  const { data: biography, isLoading } = useQuery<Biography>({
    queryKey: ["/api/biography"],
  });

  const updateBiographyMutation = useMutation({
    mutationFn: async (data: Partial<Biography>) => {
      return apiRequest("/api/admin/biography", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/biography"] });
      toast({
        title: "Biography Updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update biography",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (biography) {
      setHeroTitle(biography.heroTitle || "");
      setBioText(biography.bioText || "");
      setLocations(biography.locations || []);
      setCourses(biography.courses || []);
      setClients(biography.clients || []);
      setMemberOf(biography.memberOf || []);
      setProfileImageUrl(biography.profileImageUrl || "");
      setPhotoPreview(biography.profileImageUrl || null);
    }
  }, [biography]);

  const handlePhotoUpload = (file: File) => {
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSave = () => {
    if (photoFile) {
      // Upload photo first, then update biography
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      apiRequest('/api/admin/biography/photo', {
        method: 'POST',
        body: formData,
      }).then((response: any) => {
        const imageUrl = response.imageUrl;
        updateBiographyMutation.mutate({
          heroTitle,
          bioText,
          locations,
          courses,
          clients,
          memberOf,
          profileImageUrl: imageUrl,
        });
      }).catch((error) => {
        toast({
          title: "Error",
          description: "Failed to upload photo",
          variant: "destructive",
        });
      });
    } else {
      updateBiographyMutation.mutate({
        heroTitle,
        bioText,
        locations,
        courses,
        clients,
        memberOf,
        profileImageUrl,
      });
    }
  };

  const addLocation = () => {
    if (newLocation.trim()) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation("");
    }
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const addCourse = () => {
    if (newCourse.trim()) {
      setCourses([...courses, newCourse.trim()]);
      setNewCourse("");
    }
  };

  const removeCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const addClient = () => {
    if (newClient.trim()) {
      setClients([...clients, newClient.trim()]);
      setNewClient("");
    }
  };

  const removeClient = (index: number) => {
    setClients(clients.filter((_, i) => i !== index));
  };

  const addMember = () => {
    if (newMember.trim()) {
      setMemberOf([...memberOf, newMember.trim()]);
      setNewMember("");
    }
  };

  const removeMember = (index: number) => {
    setMemberOf(memberOf.filter((_, i) => i !== index));
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Biography Editor</h2>
        <Button 
          onClick={handleSave} 
          disabled={updateBiographyMutation.isPending}
          className="bg-red-600 hover:bg-red-700"
        >
          {updateBiographyMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {photoPreview && (
              <div className="relative w-32 h-40 mx-auto">
                <img 
                  src={photoPreview} 
                  alt="Profile preview" 
                  className="w-full h-full object-cover rounded-lg shadow-md"
                />
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">Upload a new profile photo (JPG, PNG)</p>
          </CardContent>
        </Card>

        {/* Bio Text */}
        <Card>
          <CardHeader>
            <CardTitle>Biography</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter biography text..."
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add location..."
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addLocation()}
              />
              <Button onClick={addLocation} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((location, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {location}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeLocation(index)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Courses & Workshops</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add course..."
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCourse()}
              />
              <Button onClick={addCourse} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {courses.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span className="text-sm">{course}</span>
                  <X
                    className="w-4 h-4 cursor-pointer text-red-500"
                    onClick={() => removeCourse(index)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add client..."
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addClient()}
              />
              <Button onClick={addClient} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {clients.map((client, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {client}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeClient(index)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Member Of */}
        <Card>
          <CardHeader>
            <CardTitle>Member Of</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add membership..."
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addMember()}
              />
              <Button onClick={addMember} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {memberOf.map((member, index) => (
                <Badge key={index} variant="default" className="flex items-center gap-1">
                  {member}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeMember(index)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Contact type..."
                value={newContactKey}
                onChange={(e) => setNewContactKey(e.target.value)}
              />
              <Input
                placeholder="Contact value..."
                value={newContactValue}
                onChange={(e) => setNewContactValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addContact()}
              />
            </div>
            <Button onClick={addContact} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
            <div className="space-y-2">
              {Object.entries(contacts).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span className="text-sm">
                    <strong>{key}:</strong> {value}
                  </span>
                  <X
                    className="w-4 h-4 cursor-pointer text-red-500"
                    onClick={() => removeContact(key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}