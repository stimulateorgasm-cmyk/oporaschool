/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Teacher } from '../types';

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export const LogoSVG: React.FC<SVGProps> = ({ className = '', size, ...props }) => {
  const width = size || props.width || 500;
  const height = size || props.height || 500;

  return (
    <svg
      viewBox="0 0 500 500"
      width={width}
      height={height}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Outer teal circle border */}
      <circle cx="250" cy="250" r="235" fill="none" stroke="#3F6A6E" strokeWidth="24" />
      
      {/* Light minty background circle inside */}
      <circle cx="250" cy="250" r="222" fill="#E0F2F6" />

      {/* Clustered shadows and background glows */}
      <defs>
        <radialGradient id="columnGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DEFDFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#DEFDFF" stopOpacity="0" />
        </radialGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#604530" floodOpacity="0.15" />
        </filter>
      </defs>

      <circle cx="250" cy="290" r="140" fill="url(#columnGlow)" />

      {/* COLUMN / PILLAR (Support/Опора) */}
      <g filter="url(#softShadow)">
        {/* Column Base / Steps */}
        <path d="M170 380 H330 V395 Q330 405 320 405 H180 Q170 405 170 395 Z" fill="#4C8699" />
        <path d="M160 395 H340 V415 Q340 425 330 425 H170 Q160 425 160 415 Z" fill="#3A6C7D" />

        {/* Fluted Column Shaft */}
        <path d="M180 295 H320 V380 H180 Z" fill="#5299B2" />
        {/* Vertical Flutes (Lines & shadows) */}
        <rect x="195" y="295" width="16" height="85" fill="#407E94" rx="4" />
        <rect x="226" y="295" width="16" height="85" fill="#5EA9C4" rx="4" />
        <rect x="258" y="295" width="16" height="85" fill="#407E94" rx="4" />
        <rect x="289" y="295" width="16" height="85" fill="#336678" rx="4" />

        {/* Column Capital (Top Basin where kids sit) */}
        <path d="M160 250 H340 C340 250 340 295 250 295 C160 295 160 250 160 250 Z" fill="#66ACC4" />
        {/* Capital rim details */}
        <path d="M150 240 H350 V260 C350 270 340 275 330 275 H170 C160 275 150 270 150 260 Z" fill="#80C0D6" />
        <path d="M150 240 H350 V248 H150 Z" fill="#A1D5EB" />
      </g>

      {/* THE TWO CHILDREN (Our Mascots) */}
      <g>
        {/* Younger Toddler (Right Side) */}
        {/* Toddler Body (Blue/Teal shirt) */}
        <path d="M245 235 C245 210 270 185 305 185 C340 185 365 210 365 235 Z" fill="#4A8A9E" />
        {/* Toddler Head */}
        <circle cx="305" cy="180" r="38" fill="#FBD3A3" />
        {/* Toddler Hair (Cozy brown swirl) */}
        <path d="M272 165 C280 145 315 142 332 154 C335 156 315 156 305 160 C290 165 280 162 272 165 Z" fill="#937154" />
        <path d="M290 146 Q310 135 320 150 Q305 145 290 146 Z" fill="#937154" />
        {/* Toddler Eyes (Friendly simple dots) */}
        <circle cx="295" cy="180" r="4.5" fill="#604530" />
        <circle cx="318" cy="180" r="4.5" fill="#604530" />
        {/* Toddler Smile */}
        <path d="M301 192 Q306.5 197 312 192" fill="none" stroke="#604530" strokeWidth="3" strokeLinecap="round" />
        {/* Little ears */}
        <circle cx="266" cy="182" r="7" fill="#FAB882" />
        <circle cx="344" cy="182" r="7" fill="#FAB882" />

        {/* Older Child (Left Side, slightly forward and taller) */}
        {/* Older Child Body (Orange/Amber Graduation Robe) */}
        <path d="M155 245 C155 190 190 170 245 170 C290 170 310 190 310 245 Z" fill="#C48A40" />
        {/* Shadow under head */}
        <path d="M195 168 C205 180 235 180 245 168 Z" fill="#9C6B2F" opacity="0.3" />
        {/* Older Child Head */}
        <circle cx="220" cy="150" r="46" fill="#FCDCB2" />
        {/* Hair peeking out */}
        <path d="M178 140 C182 130 195 125 210 126 C195 132 188 145 188 152 Z" fill="#937154" />
        <path d="M262 140 C258 130 245 125 230 126 C245 132 252 145 252 152 Z" fill="#937154" />
        {/* Ears */}
        <circle cx="173" cy="152" r="8" fill="#F9C293" />
        <circle cx="267" cy="152" r="8" fill="#F9C293" />
        {/* Graduation Mortarboard / Cap (Amber/Gold accent) */}
        <g>
          {/* Cap Skull cap part */}
          <path d="M186 122 C186 102 254 102 254 122 Z" fill="#C48A40" />
          {/* Diamond top plate */}
          <polygon points="220,78 280,105 220,132 160,105" fill="#E69C45" stroke="#A8712C" strokeWidth="2" />
          {/* Cap Tassel */}
          <path d="M180 106 V145 L175 145" fill="none" stroke="#F8CE7A" strokeWidth="3" strokeLinecap="round" />
          <circle cx="175" cy="148" r="4" fill="#F8CE7A" />
        </g>
        {/* Friendly Eyes */}
        <circle cx="206" cy="150" r="5" fill="#604530" />
        <circle cx="234" cy="150" r="5" fill="#604530" />
        {/* Warm Smile */}
        <path d="M213 164 Q220 170 227 164" fill="none" stroke="#604530" strokeWidth="3.5" strokeLinecap="round" />

        {/* Hands Resting on the Column Rim */}
        <circle cx="162" cy="246" r="11" fill="#FCDCB2" filter="url(#softShadow)" />
        <circle cx="244" cy="250" r="11" fill="#FCDCB2" />
      </g>
    </svg>
  );
};

export const CozyClassroomSVG: React.FC<SVGProps> = ({ className = '', ...props }) => {
  return (
    <svg
      viewBox="0 0 600 450"
      className={`w-full h-auto rounded-2xl shadow-lamp select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Background (cozy warm wall color) */}
      <rect width="600" height="450" fill="#DEFDFF" rx="16" />
      
      {/* Wooden Floor representation */}
      <path d="M0 340 L600 340 L600 450 L0 450 Z" fill="#937154" opacity="0.15" />
      <line x1="0" y1="340" x2="600" y2="340" stroke="#937154" strokeWidth="3" opacity="0.3" />
      <line x1="120" y1="340" x2="80" y2="450" stroke="#937154" strokeWidth="1.5" opacity="0.2" />
      <line x1="300" y1="340" x2="300" y2="450" stroke="#937154" strokeWidth="1.5" opacity="0.2" />
      <line x1="480" y1="340" x2="520" y2="450" stroke="#937154" strokeWidth="1.5" opacity="0.2" />

      {/* Large green blackboard with friendly chalk illustration */}
      <g>
        {/* Wooden frame */}
        <rect x="80" y="40" width="440" height="240" fill="#604530" rx="8" />
        {/* Blackboard surface */}
        <rect x="90" y="50" width="420" height="220" fill="#3F6A6E" rx="4" />
        
        {/* Teacher chalk drawing details on the board */}
        <text x="300" y="110" fontFamily="Comfortaa, sans-serif" fontSize="24" fontWeight="bold" fill="#F8CE7A" textAnchor="middle" opacity="0.9">
          Опора
        </text>
        <text x="300" y="145" fontFamily="Nunito, sans-serif" fontSize="14" fill="#FCFBF7" textAnchor="middle" opacity="0.8">
          образовательный центр
        </text>
        
        {/* Decorative math/science drawings */}
        <path d="M120 220 L150 180 L180 220 Z" fill="none" stroke="#FCFBF7" strokeWidth="2" opacity="0.5" />
        <circle cx="450" cy="210" r="15" fill="none" stroke="#FCFBF7" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
        <path d="M440 210 Q450 190 460 210" fill="none" stroke="#FCFBF7" strokeWidth="2" opacity="0.5" />
        <text x="140" y="100" fontFamily="JetBrains Mono, monospace" fontSize="16" fill="#F8CE7A" opacity="0.4">f(x) = x²</text>
        <text x="430" y="100" fontFamily="Comfortaa, sans-serif" fontSize="18" fill="#F8CE7A" opacity="0.4">A + B = C</text>
      </g>

      {/* Friendly Teacher (Female, styled after the warm retro Russian cartoons) */}
      <g>
        {/* Body & Red Sweater */}
        <path d="M460 410 C460 350 490 310 540 310 C590 310 600 350 600 410 Z" fill="#C48A40" />
        {/* White collar */}
        <polygon points="525,310 540,325 555,310" fill="#FCFBF7" />
        
        {/* Head */}
        <circle cx="525" cy="250" r="35" fill="#FCDCB2" />
        {/* Dark Hair in elegant 1970s bobby/retro style */}
        <path d="M485 240 C485 200 555 190 565 230 C570 250 565 265 560 270 C555 255 540 250 525 250 C505 250 490 260 485 240 Z" fill="#604530" />
        <circle cx="495" cy="265" r="10" fill="#604530" /> {/* Hair bun/back */}
        
        {/* Glasses */}
        <circle cx="515" cy="248" r="10" fill="none" stroke="#937154" strokeWidth="2.5" />
        <circle cx="538" cy="248" r="10" fill="none" stroke="#937154" strokeWidth="2.5" />
        <line x1="525" y1="248" x2="528" y2="248" stroke="#937154" strokeWidth="2.5" />
        
        {/* Eyes & Smile */}
        <circle cx="515" cy="248" r="2" fill="#604530" />
        <circle cx="538" cy="248" r="2" fill="#604530" />
        <path d="M522 268 Q528 274 534 268" fill="none" stroke="#604530" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Pointer Stick in Hand */}
        <line x1="510" y1="330" x2="400" y2="200" stroke="#F8CE7A" strokeWidth="4" strokeLinecap="round" />
        {/* Hand */}
        <circle cx="510" cy="330" r="7" fill="#FCDCB2" />
      </g>

      {/* Group of Children at desk (seen from back/side in cozy warm outfits) */}
      <g>
        {/* Desk */}
        <rect x="50" y="325" width="340" height="15" fill="#937154" rx="3" />
        <rect x="80" y="340" width="12" height="90" fill="#604530" />
        <rect x="340" y="340" width="12" height="90" fill="#604530" />

        {/* Child 1 (Left, boy in green sweater) */}
        <g>
          {/* Hair */}
          <path d="M100 255 C100 240 140 240 140 255 C140 270 100 270 100 255 Z" fill="#937154" />
          {/* Head */}
          <circle cx="120" cy="270" r="20" fill="#FBD3A3" />
          {/* Hair detailing */}
          <path d="M102 265 Q115 250 135 260 Q120 255 102 265 Z" fill="#604530" />
          {/* Collar & Clothes */}
          <path d="M90 325 C90 290 150 290 150 325 Z" fill="#5C7367" />
          <rect x="110" y="290" width="20" height="8" fill="#FCFBF7" rx="2" />
        </g>

        {/* Child 2 (Center, girl with orange bow) */}
        <g>
          {/* Hair (blonde/golden) */}
          <circle cx="215" cy="265" r="22" fill="#F8CE7A" />
          {/* Big Orange Bow */}
          <path d="M215 240 L195 230 L215 248 L235 230 Z" fill="#C48A40" />
          <circle cx="215" cy="242" r="5" fill="#604530" />
          {/* Head */}
          <circle cx="215" cy="270" r="18" fill="#FCDCB2" />
          {/* Collar & Clothes (warm terracotta/brown) */}
          <path d="M185 325 C185 292 245 292 245 325 Z" fill="#C48A40" />
          <polygon points="205,288 215,296 225,288" fill="#FCFBF7" />
        </g>

        {/* Child 3 (Right, boy with dark curly hair) */}
        <g>
          {/* Hair */}
          <path d="M290 255 C280 240 330 235 330 255 C330 270 290 270 290 255 Z" fill="#604530" />
          <circle cx="295" cy="250" r="8" fill="#604530" />
          <circle cx="310" cy="246" r="8" fill="#604530" />
          <circle cx="322" cy="252" r="8" fill="#604530" />
          {/* Head */}
          <circle cx="310" cy="270" r="19" fill="#FCDCB2" />
          {/* Collar & Clothes (warm blue) */}
          <path d="M280 325 C280 290 340 290 340 325 Z" fill="#3F6A6E" />
          <rect x="300" y="289" width="20" height="7" fill="#FCFBF7" rx="2" />
        </g>
      </g>

      {/* Decorative details - cozy flowers & wooden framing borders */}
      <rect x="20" y="20" width="560" height="12" fill="#DEFDFF" rx="4" opacity="0.3" />
    </svg>
  );
};

export const TeacherCardSVG: React.FC<{ type: string; className?: string }> = ({ type, className = '' }) => {
  // Renders beautiful, customized retro illustrations for the teacher cards based on type
  return (
    <div className={`relative flex items-center justify-center p-3 rounded-2xl overflow-hidden w-28 h-28 ${className}`}>
      {type === 'teacher_elena' && (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#E8F5E9" />
          <path d="M20 90 C20 65 35 55 50 55 C65 55 80 65 80 90 Z" fill="#5C7367" />
          <circle cx="50" cy="40" r="18" fill="#FCDCB2" />
          {/* Glasses */}
          <circle cx="45" cy="40" r="5" fill="none" stroke="#604530" strokeWidth="1.5" />
          <circle cx="55" cy="40" r="5" fill="none" stroke="#604530" strokeWidth="1.5" />
          <line x1="50" y1="40" x2="50" y2="40" stroke="#604530" strokeWidth="1.5" />
          {/* Hair */}
          <path d="M32 35 C32 20 68 20 68 35 C68 40 65 42 60 42 C50 42 50 36 40 38 Z" fill="#604530" />
          {/* Smile */}
          <path d="M47 48 Q50 51 53 48" fill="none" stroke="#604530" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {type === 'teacher_alex' && (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#FFF3E0" />
          <path d="M20 90 C20 65 35 55 50 55 C65 55 80 65 80 90 Z" fill="#3F6A6E" />
          <circle cx="50" cy="40" r="18" fill="#FBD3A3" />
          {/* Hair & beard */}
          <path d="M32 35 C32 20 68 20 68 35" fill="none" stroke="#937154" strokeWidth="4" strokeLinecap="round" />
          <path d="M34 32 C38 24 62 24 66 32 Z" fill="#937154" />
          <path d="M38 48 C42 55 58 55 62 48 Z" fill="#937154" opacity="0.4" />
          {/* Eyes */}
          <circle cx="44" cy="38" r="2" fill="#604530" />
          <circle cx="56" cy="38" r="2" fill="#604530" />
          {/* Smile */}
          <path d="M47 45 Q50 48 53 45" fill="none" stroke="#604530" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {type === 'teacher_irina' && (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#E1F5FE" />
          <path d="M20 90 C20 65 35 55 50 55 C65 55 80 65 80 90 Z" fill="#C48A40" />
          <circle cx="50" cy="40" r="17" fill="#FCDCB2" />
          {/* Hair (blonde/warm yellow bun) */}
          <circle cx="50" cy="20" r="8" fill="#F8CE7A" />
          <path d="M33 34 C33 24 67 24 67 34 C67 42 62 40 50 40 C38 40 33 42 33 34 Z" fill="#F8CE7A" />
          {/* Eyes & Smile */}
          <circle cx="45" cy="38" r="2" fill="#604530" />
          <circle cx="55" cy="38" r="2" fill="#604530" />
          <path d="M46 46 Q50 49 54 46" fill="none" stroke="#604530" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {type === 'teacher_tatyana' && (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#FFEBEE" />
          <path d="M20 90 C20 65 35 55 50 55 C65 55 80 65 80 90 Z" fill="#937154" />
          <circle cx="50" cy="40" r="18" fill="#FCDCB2" />
          {/* Hair */}
          <path d="M31 38 C31 18 69 18 69 38 C69 50 31 50 31 38 Z" fill="#C48A40" />
          <circle cx="34" cy="44" r="6" fill="#C48A40" />
          <circle cx="66" cy="44" r="6" fill="#C48A40" />
          {/* Eyes & Smile */}
          <circle cx="44" cy="38" r="2" fill="#604530" />
          <circle cx="56" cy="38" r="2" fill="#604530" />
          <path d="M46 46 Q50 49 54 46" fill="none" stroke="#604530" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {type === 'teacher_dmitry' && (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#E8EAF6" />
          <path d="M20 90 C20 65 35 55 50 55 C65 55 80 65 80 90 Z" fill="#5C7367" />
          <circle cx="50" cy="40" r="18" fill="#FCDCB2" />
          {/* Hair & stylish grey temple peeks */}
          <path d="M32 34 C35 22 65 22 68 34 Z" fill="#604530" />
          {/* Glasses */}
          <circle cx="44" cy="38" r="5" fill="none" stroke="#604530" strokeWidth="1" />
          <circle cx="56" cy="38" r="5" fill="none" stroke="#604530" strokeWidth="1" />
          <line x1="49" y1="38" x2="51" y2="38" stroke="#604530" strokeWidth="1" />
          {/* Eyes & Smile */}
          <circle cx="44" cy="38" r="1.5" fill="#604530" />
          <circle cx="56" cy="38" r="1.5" fill="#604530" />
          <path d="M47 46 Q50 49 53 46" fill="none" stroke="#604530" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {type === 'teacher_natalya' && (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#FFF8E1" />
          {/* Navy Blue Dress */}
          <path d="M20 90 C20 65 35 55 50 55 C65 55 80 65 80 90 Z" fill="#1E3A8A" />
          <circle cx="50" cy="40" r="18" fill="#FCDCB2" />
          {/* Long Hair with bangs */}
          <path d="M31 40 C28 48 30 65 33 70 C35 72 38 72 38 65 C38 50 35 45 35 40 Z" fill="#A8825F" />
          <path d="M69 40 C72 48 70 65 67 70 C65 72 62 72 62 65 C62 50 65 45 65 40 Z" fill="#A8825F" />
          <path d="M31 38 C31 18 69 18 69 38 C69 42 62 40 50 40 C38 40 31 42 31 38 Z" fill="#A8825F" />
          <path d="M32 32 Q50 35 68 32 Q65 24 50 24 Q35 24 32 32 Z" fill="#937154" />
          {/* Eyes & Smile */}
          <circle cx="44" cy="38" r="2" fill="#604530" />
          <circle cx="56" cy="38" r="2" fill="#604530" />
          <path d="M46 46 Q50 49 54 46" fill="none" stroke="#604530" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {/* Fallback portrait for unknown or newly created teachers when SVG type is not found */}
      {!['teacher_elena', 'teacher_alex', 'teacher_irina', 'teacher_tatyana', 'teacher_dmitry', 'teacher_natalya'].includes(type) && (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#ECEFF1" />
          <path d="M20 90 C20 65 35 55 50 55 C65 55 80 65 80 90 Z" fill="#455A64" />
          <circle cx="50" cy="40" r="18" fill="#FCDCB2" />
          {/* Hair */}
          <path d="M32 38 C32 18 68 18 68 38 C68 45 32 45 32 38 Z" fill="#78909C" />
          {/* Eyes & Smile */}
          <circle cx="44" cy="38" r="2" fill="#37474F" />
          <circle cx="56" cy="38" r="2" fill="#37474F" />
          <path d="M46 46 Q50 49 54 46" fill="none" stroke="#37474F" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
};

export const TeacherAvatar: React.FC<{
  teacher: Teacher;
  className?: string;
}> = ({ teacher, className = 'w-24 h-24' }) => {
  const [hasError, setHasError] = useState(false);
  const isHttp = teacher.photoUrl && teacher.photoUrl.startsWith('http');
  const isLocal = teacher.photoUrl && teacher.photoUrl.startsWith('/');
  const isSvgType = ['teacher_elena', 'teacher_alex', 'teacher_irina', 'teacher_tatyana', 'teacher_dmitry', 'teacher_natalya'].includes(teacher.photoUrl);

  if (isHttp && !hasError) {
    return (
      <img
        src={teacher.photoUrl}
        alt={teacher.name}
        width="200"
        height="200"
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${className} rounded-full object-cover border border-brand-sage/10`}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (isLocal && !hasError) {
    // WebP-миниатюра для аватарок, оригинал — фолбэк
    const thumbWebp = teacher.photoUrl.replace(/\.(jpg|jpeg|png)$/i, '-thumb.webp');
    return (
      <picture>
        <source srcSet={thumbWebp} type="image/webp" />
        <img
          src={teacher.photoUrl}
          alt={teacher.name}
          width="200"
          height="200"
          loading="lazy"
          onError={() => setHasError(true)}
          className={`${className} rounded-full object-cover border border-brand-sage/10`}
        />
      </picture>
    );
  }

  if (isSvgType) {
    return <TeacherCardSVG type={teacher.photoUrl} className={className} />;
  }

  // Generate initials (e.g. "Ангелина Викторовна" -> "АВ")
  const parts = teacher.name.trim().split(/\s+/);
  let initials = '';
  if (parts.length > 0 && parts[0]) initials += parts[0][0].toUpperCase();
  if (parts.length > 1 && parts[1]) initials += parts[1][0].toUpperCase();
  if (!initials) initials = '?';

  // Determine text size based on container size
  const isSmall = className.includes('w-10') || className.includes('h-10');
  const textSize = isSmall ? 'text-xs font-bold' : 'text-2xl font-black';

  // Use the teacher's avatarBg or a fallback
  const bgClass = teacher.avatarBg || 'bg-brand-mint-pale text-brand-teal';

  return (
    <div className={`${className} rounded-full flex items-center justify-center border-2 border-brand-teal/20 uppercase shadow-sm ${bgClass}`}>
      <span className={`${textSize} tracking-wider select-none font-display`}>{initials}</span>
    </div>
  );
};
