import React from 'react';
import { Container, Typography, Paper, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import { privacyContent } from './privacy_content'; // Import the FAQ content

function PrivacyView() {
  const theme = useTheme(); // Access the current theme (light/dark)

  // Helper function to render different content types within an answer
  const renderAnswerItem = (item, key) => {
    if (typeof item === 'string') {
      // Render strings directly, assuming they are paragraphs or parts of an answer
      return <Typography key={key} variant="body1" paragraph sx={{ mb: 1 }}>{item}</Typography>;
    }
    if (item.type === 'list') {
      return (
        // Use ul/li for semantic lists, styled by MUI components
        <Box key={key} component="ul" sx={{ mt: 0, mb: 1, pl: 4 }}>
          {item.items.map((listItem, index) => (
            <Box component="li" key={index} sx={{ display: 'list-item', listStyleType: 'disc', mb: 0.5 }}>
              <Typography variant="body1" component="span">{listItem}</Typography>
            </Box>
          ))}
        </Box>
      );
    }
    // Add more types if needed
    return null;
  };

  // Added missing opening parenthesis
  return (
    // Use Box for full height and centering if needed, or just Container
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', /* Adjust based on header */ bgcolor: 'background.default', py: 4 }}>
      <Container component="main" maxWidth="md" sx={{ flexGrow: 1 }}>
       {/* Use theme's default Paper border radius (16px) */}
       <Paper sx={{ p: { xs: 2, sm: 3 }, boxShadow: 3, borderRadius: 4 /* Example: Use theme's large radius */ }}> {/* Adjust padding */}
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
            {privacyContent.title}
          </Typography>
          <Typography variant="body2" paragraph color="text.secondary" sx={{ mb: 3 }}>
            Last Updated: {privacyContent.lastUpdated}
          </Typography>

          {privacyContent.faqs.map((faq) => (
            <Accordion
              key={faq.id}
              defaultExpanded={faq.id === 'faq-1'} // Optionally expand the first FAQ
              sx={{
                '&:before': { display: 'none' }, // Remove top border
                boxShadow: 'none', // Remove individual accordion shadow if desired
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 0 }, // Remove border for last item
                bgcolor: 'transparent', // Use paper background
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${faq.id}-content`}
                id={`${faq.id}-header`}
                sx={{
                  py: 1, // Adjust padding
                  '& .MuiAccordionSummary-content': { marginY: 0 }, // Adjust margin
                }}
              >
                <Typography variant="h6" component="div" sx={{ fontWeight: 500, fontSize: '1.1rem' }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                {Array.isArray(faq.answer)
                  ? faq.answer.map((item, index) => renderAnswerItem(item, `${faq.id}-ans-${index}`))
                  : renderAnswerItem(faq.answer, `${faq.id}-ans-0`) // Handle single string answer
                }
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      </Container>
    </Box>
  );
}

export default PrivacyView;