module.exports = {
    plugins: [require('@tailwindcss/custom-forms')],
    theme: {
        screens: {
            sm: '640px',
            // => @media (min-width: 640px) { ... }
            md: '768px',
            // => @media (min-width: 768px) { ... }
            lg: '1024px',
            // => @media (min-width: 1024px) { ... }
            xl: '1280px',
            // => @media (min-width: 1280px) { ... }

            'xl-down': { max: '1279px' },
            // => @media (max-width: 1279px) { ... }
            'lg-down': { max: '1023px' },
            // => @media (max-width: 1023px) { ... }
            'md-down': { max: '767px' },
            // => @media (max-width: 767px) { ... }
            'sm-down': { max: '639px' },
            // => @media (max-width: 639px) { ... }
        },
    },
};
