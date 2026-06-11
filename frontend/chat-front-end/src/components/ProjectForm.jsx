// components/ProjectForm.jsx
import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../lib/axios';

const PRESETS = {
  custom: { label: 'Custom', months: 0 },
  minor_renovation: { label: 'Minor Renovation (1 Month)', months: 1 },
  standard_renovation: { label: 'Standard Renovation (3 Months)', months: 3 },
  new_building: { label: 'New Building / Residential (6 Months)', months: 6 },
  large_scale: { label: 'Large Scale Construction (12 Months)', months: 12 },
};

const ProjectForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    location: '',
    description: '',
    contactNumber: '',
    startDate: '',
    targetDeadline: ''
  });
  const [clients, setClients] = useState([]);
  const [projectPreset, setProjectPreset] = useState('custom');

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'targetDeadline' && projectPreset !== 'custom') {
      setProjectPreset('custom');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const addMonths = (dateStr, months) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (projectPreset !== 'custom' && formData.startDate) {
      const monthsToAdd = PRESETS[projectPreset].months;
      const newDeadline = addMonths(formData.startDate, monthsToAdd);
      if (formData.targetDeadline !== newDeadline) {
        setFormData(prev => ({ ...prev, targetDeadline: newDeadline }));
      }
    }
  }, [projectPreset, formData.startDate]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axiosInstance.get('/clients');
        setClients(res.data || []);
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    };
    fetchClients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let uploadedUrl = '';

      if (file) {
        setIsUploading(true);
        const formDataFile = new FormData();
        formDataFile.append('file', file);

        const res = await axiosInstance.post('/upload', formDataFile);
        uploadedUrl = res.data.url;
        setIsUploading(false);
      }

      const finalData = {
        ...formData,
        fileUrl: uploadedUrl, // Optional: you can name it whatever suits your backend
      };

      onSubmit(finalData); // Call parent handler with full data
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      alert('Error uploading file. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Client</label>
        <select
          name="clientId"
          value={formData.clientId}
          onChange={handleChange}
          className="select select-bordered w-full"
          required
        >
          <option value="" disabled>Select a client</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Contact Number</label>
        <input
          type="text"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div>
        <label className="label">Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="textarea textarea-bordered w-full"
          rows="3"
        ></textarea>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-4">
        <div>
          <label className="label font-semibold text-slate-700">Project Type Preset</label>
          <select
            value={projectPreset}
            onChange={(e) => setProjectPreset(e.target.value)}
            className="select select-bordered w-full bg-white border-slate-300 focus:border-indigo-500"
          >
            {Object.entries(PRESETS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {projectPreset !== 'custom' && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Auto-calculates deadline to {PRESETS[projectPreset].months} months from Start Date
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="label font-semibold text-slate-700">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="input input-bordered w-full bg-white border-slate-300 focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex-1">
            <label className="label font-semibold text-slate-700">
              Target Deadline
              {projectPreset !== 'custom' && formData.startDate && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-2">Auto-set</span>}
            </label>
            <input
              type="date"
              name="targetDeadline"
              value={formData.targetDeadline}
              onChange={handleChange}
              className="input input-bordered w-full bg-white border-slate-300 focus:border-indigo-500"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label">Attach File (optional)</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full"
        />
      </div>

      {isUploading && <p className="text-sm text-blue-500">Uploading file to Cloudinary...</p>}

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isUploading}>
          Submit
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
