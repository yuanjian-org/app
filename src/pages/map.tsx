import React from 'react';
import fs from 'fs';
import { GetServerSideProps } from 'next';
import { parse } from 'yaml';

const MapPage: React.FC = () => {
    return null;  // Do not render anything
};

export default MapPage;

export const getServerSideProps: GetServerSideProps = async () => {
    try {
        const file = fs.readFileSync('src/pages/map/同理心.yaml', 'utf8');
        const yamlData = parse(file);
        console.log('Server-side log:', yamlData);
        return {
            props: {},  // No props passed
        };
    } catch (error) {
        console.error('Error reading or parsing YAML file:', error);
        return {
            notFound: true,
        };
    }
};
