import React from 'react';

export default function DoctorFooter() {
	return (
		<footer className="bg-white border-t border-slate-100 p-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
			© {new Date().getFullYear()} chronic care connect • clinical division
		</footer>
	);
}
