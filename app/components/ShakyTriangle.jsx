// this component is completely useless but I was bored and it's kinda cool

'use client';

import React, { useRef, useEffect } from 'react';

const ShakyTriangle = ({ position, mousePosition }) => {
    const feTurbulenceRef = useRef(null);
    const svgRef = useRef(null); 
    const patternId = `dots-${position}`;
    const filterId = `wavy-${position}`;

    // runs on mount
    useEffect(() => {
        const turbulence = feTurbulenceRef.current;
        if (!turbulence) 
            return;

        let seed = Math.random() * 1000; // start with random seed (needed for good turbulance pattern)
        let animationFrameId = null; // stores current frame
        function animate() {
            seed += 0.5; // slightly increase seed each frame to make it shaky
            turbulence.setAttribute('seed', seed.toString()); // update turbulance seed
            animationFrameId = requestAnimationFrame(animate); // creates animation loop
        }
        animate(); // starts the animation

        // when unmounted (removed from screen)
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    let distance = Infinity;
    if (svgRef.current && mousePosition.x !== null && mousePosition.y !== null) {
        const rect = svgRef.current.getBoundingClientRect();
        const dx = mousePosition.x - (rect.left + rect.width / 2); // distance from mouse's x-coordinate to the center of the rect
        const dy = mousePosition.y - (rect.top + rect.height / 2); // distance from mouse's y-coordinate to the center of the rect
        distance = Math.sqrt(dx * dx + dy * dy); // total distance from mouse to center of rect
    }

    let points;
    let positionClass;

    // sets the points of polygons and position on screen based on position string
    if (position === 'tl') {
        points = "0,0 350,0 0,350";
        positionClass = 'top-[3rem] left-[3rem]'
    } 
    else if (position === 'tr') {
        points = "350,0 -5,0 350,355";
        positionClass = 'top-[3rem] right-[3rem]'
    }
    else if (position === 'bl') {
        points = "0,-5 0,350 355,350";
        positionClass = 'bottom-[2.5rem] left-[3rem]'
    }
    else if (position === 'br') {
        points = "350,0 350,350 0,350";
        positionClass = 'bottom-[2.5rem] right-[3rem]'
    }

    let scale = 1;
    if (typeof window !== 'undefined') // had to add this because was getting runtime error on load
        scale = Math.max(1, 14 - Math.min(distance, window.innerWidth / 3) / (window.innerWidth / 3) * (14 - 1));
        // key: 1 = no shake, 14 = max shake, distance = mouse distance from rect, window.innerWidth / 3 = circumference of impact (minumum distance to have an effect)
    return (
        <svg
            ref={svgRef} 
            width="350"
            height="350"
            className={`fixed ${positionClass}`} 
        >
            <defs>
                <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="1.25" cy="1.25" r="1.25" fill="#116D6E" />
                </pattern>
                <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
                    <feTurbulence
                        ref={feTurbulenceRef}
                        type="fractalNoise"
                        baseFrequency="0.1 0.3"
                        numOctaves="1"
                        seed="0"
                        result="turbulence"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="turbulence"
                        scale={scale}
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </defs>
            <polygon
                points={points}
                fill={`url(#${patternId})`}
                filter={`url(#${filterId})`}
            />
            
        </svg>
    );
};

export default ShakyTriangle;