export const getTeamAtGivenDate = (teamOccurences, date) => {
    const sortedTeamOccurences = teamOccurences.slice().sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
    
    for (const team of sortedTeamOccurences) {
        if (new Date(team.fromDate) <= date && new Date(team.toDate) >= date) {
            return team;
        }
    }

    for (const team of sortedTeamOccurences) {
        if (!team.toDate && new Date(team.fromDate) <= date) {
            return team;
        }
    }

    return null;
};